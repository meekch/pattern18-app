-- 010_evidence_integrity.sql
-- Integrity & provenance for evidence records and document generation.
--
-- Enforcement lives in triggers rather than application code because
-- incidents are written directly from the browser in several places
-- (coach/page.tsx, QuickLogModal, BulkMessageUpload, AddIncidentForm).
-- A trigger is the only layer every one of those writes must pass through.

create extension if not exists pgcrypto with schema extensions;

-- ============================================================================
-- 1. COLUMNS
-- ============================================================================

alter table public.incidents
  add column if not exists text_hash  text,
  add column if not exists hashed_at  timestamptz,
  add column if not exists deleted_at timestamptz;

-- evidence_timeline.image_hash already exists (text, unused, 1/5 populated).
-- image_hash = sha256 of the bytes actually STORED (post EXIF strip), so it
-- can be re-verified against the stored object. The pre-strip bytes are not
-- hashed: the original is deliberately destroyed, so such a hash could never
-- be checked against anything.
alter table public.evidence_timeline
  add column if not exists hashed_at  timestamptz,
  add column if not exists deleted_at timestamptz;

create index if not exists incidents_user_active_idx
  on public.incidents (user_id, incident_date desc)
  where deleted_at is null;

create index if not exists incidents_text_hash_idx
  on public.incidents (user_id, text_hash);

-- ============================================================================
-- 2. TEXT HASH (before insert on incidents)
-- ============================================================================

-- Mirrors the message-text precedence used by duplicate-detection.ts:
-- coparent_message first, then the first coparent entry in messages_json,
-- then the first entry with any text. Unlike createFingerprint() this is NOT
-- normalised or truncated -- it hashes the exact stored text.
create or replace function public.incident_message_text(
  p_coparent_message text,
  p_messages_json    jsonb
) returns text
language sql
immutable
as $$
  select coalesce(
    nullif(btrim(coalesce(p_coparent_message, '')), ''),
    (select m->>'text'
       from jsonb_array_elements(coalesce(p_messages_json, '[]'::jsonb)) m
      where m->>'sender' = 'coparent'
        and coalesce(btrim(m->>'text'), '') <> ''
      limit 1),
    (select m->>'text'
       from jsonb_array_elements(coalesce(p_messages_json, '[]'::jsonb)) m
      where coalesce(btrim(m->>'text'), '') <> ''
      limit 1)
  );
$$;

create or replace function public.incidents_set_text_hash()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
declare
  v_text text;
begin
  v_text := public.incident_message_text(
    new.coparent_message,
    new.messages_json::jsonb
  );

  if v_text is not null and btrim(v_text) <> '' then
    new.text_hash := encode(
      extensions.digest(convert_to(v_text, 'UTF8'), 'sha256'), 'hex'
    );
    new.hashed_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists incidents_set_text_hash_before_insert on public.incidents;
create trigger incidents_set_text_hash_before_insert
  before insert on public.incidents
  for each row execute function public.incidents_set_text_hash();

-- ============================================================================
-- 3. IMMUTABILITY (before update on incidents)
--    Raw captured evidence is frozen once hashed. Tagging stays editable.
-- ============================================================================

create or replace function public.incidents_enforce_immutable()
returns trigger
language plpgsql
as $$
begin
  if new.text_hash is distinct from old.text_hash then
    raise exception 'incidents.text_hash is immutable (incident %)', old.id
      using errcode = 'check_violation';
  end if;

  if old.text_hash is not null then
    if new.coparent_message is distinct from old.coparent_message then
      raise exception 'incidents.coparent_message is immutable once hashed (incident %)', old.id
        using errcode = 'check_violation';
    end if;
    if new.messages_json::jsonb is distinct from old.messages_json::jsonb then
      raise exception 'incidents.messages_json is immutable once hashed (incident %)', old.id
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists incidents_enforce_immutable_before_update on public.incidents;
create trigger incidents_enforce_immutable_before_update
  before update on public.incidents
  for each row execute function public.incidents_enforce_immutable();

-- ============================================================================
-- 4. EDIT LOG (after update on incidents)
-- ============================================================================

create table if not exists public.incident_edits (
  id          uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  user_id     uuid references auth.users(id),
  field       text not null,
  old_value   jsonb,
  new_value   jsonb,
  edited_at   timestamptz not null default now()
);

create index if not exists incident_edits_incident_idx
  on public.incident_edits (incident_id, edited_at desc);

-- security definer so the log is written even though clients hold no INSERT
-- policy on incident_edits -- the table is append-only from their side.
create or replace function public.incidents_log_edits()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_fields text[] := array[
    'severity', 'patterns', 'pattern_details', 'category', 'title',
    'include_in_exhibit', 'is_court_ready', 'notes', 'incident_date',
    'source', 'source_type', 'source_name', 'evidence_strength', 'deleted_at'
  ];
  v_old   jsonb := to_jsonb(old);
  v_new   jsonb := to_jsonb(new);
  v_actor uuid  := coalesce(auth.uid(), new.user_id);
  f       text;
begin
  foreach f in array v_fields loop
    if (v_old -> f) is distinct from (v_new -> f) then
      insert into public.incident_edits
        (incident_id, user_id, field, old_value, new_value)
      values
        (new.id, v_actor, f, v_old -> f, v_new -> f);
    end if;
  end loop;

  return null;
end;
$$;

drop trigger if exists incidents_log_edits_after_update on public.incidents;
create trigger incidents_log_edits_after_update
  after update on public.incidents
  for each row execute function public.incidents_log_edits();

-- ============================================================================
-- 5. IMAGE HASH GUARD (evidence_timeline)
--    NOTE: the hash itself is computed in api/evidence/route.ts, not here.
--    Postgres cannot hash the image: the row holds only object paths/URLs,
--    and the bytes live in Supabase Storage. The trigger stamps hashed_at
--    and then freezes the hashes and the screenshot list.
-- ============================================================================

create or replace function public.evidence_timeline_guard_hashes()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.image_hash is not null then
      new.hashed_at := now();
    end if;
    return new;
  end if;

  if old.image_hash is not null
     and new.image_hash is distinct from old.image_hash then
    raise exception 'evidence_timeline.image_hash is immutable (row %)', old.id
      using errcode = 'check_violation';
  end if;

  if old.image_hash is not null
     and new.screenshot_urls is distinct from old.screenshot_urls then
    raise exception 'evidence_timeline.screenshot_urls is immutable once hashed (row %)', old.id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists evidence_timeline_guard_hashes_ins on public.evidence_timeline;
create trigger evidence_timeline_guard_hashes_ins
  before insert on public.evidence_timeline
  for each row execute function public.evidence_timeline_guard_hashes();

drop trigger if exists evidence_timeline_guard_hashes_upd on public.evidence_timeline;
create trigger evidence_timeline_guard_hashes_upd
  before update on public.evidence_timeline
  for each row execute function public.evidence_timeline_guard_hashes();

-- ============================================================================
-- 6. DOCUMENT GENERATION MANIFESTS
-- ============================================================================

create table if not exists public.document_generations (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id),
  doc_type          text not null,
  generated_at      timestamptz not null default now(),
  -- [{ incident_id, text_hash, image_hash }]
  incident_manifest jsonb not null default '[]'::jsonb,
  incident_count    integer generated always as
                      (jsonb_array_length(incident_manifest)) stored
);

create index if not exists document_generations_user_idx
  on public.document_generations (user_id, generated_at desc);

-- ============================================================================
-- 7. RLS -- both new tables are read-own / insert-own, never update or delete.
--    The absence of UPDATE/DELETE policies is what makes them append-only.
-- ============================================================================

alter table public.incident_edits        enable row level security;
alter table public.document_generations  enable row level security;

drop policy if exists incident_edits_select_own on public.incident_edits;
create policy incident_edits_select_own
  on public.incident_edits for select
  using (auth.uid() = user_id);

drop policy if exists document_generations_select_own on public.document_generations;
create policy document_generations_select_own
  on public.document_generations for select
  using (auth.uid() = user_id);

drop policy if exists document_generations_insert_own on public.document_generations;
create policy document_generations_insert_own
  on public.document_generations for insert
  with check (auth.uid() = user_id);
