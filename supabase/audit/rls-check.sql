-- Pattern18 RLS audit
-- Paste into Supabase SQL Editor. Read-only; returns 3 result sets.
--
-- 1) Per-table RLS status and policy count
-- 2) Full policy definitions (expression, check, roles, command)
-- 3) Tables that have RLS disabled OR zero policies (the risk list)
--
-- Scope: every user table in the `public` schema. Adjust the schema
-- filter if your app uses a different one.

-- =========================================================
-- 1) Summary: every public table, RLS flag, policy count
-- =========================================================
SELECT
  n.nspname                                              AS schema,
  c.relname                                              AS table_name,
  c.relrowsecurity                                       AS rls_enabled,
  c.relforcerowsecurity                                  AS rls_forced,
  COALESCE(p.policy_count, 0)                            AS policy_count,
  CASE
    WHEN NOT c.relrowsecurity              THEN 'RLS DISABLED'
    WHEN COALESCE(p.policy_count, 0) = 0   THEN 'RLS ON BUT NO POLICIES (blocks all non-service-role access)'
    ELSE 'OK'
  END                                                    AS status
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
LEFT JOIN (
  SELECT schemaname, tablename, COUNT(*) AS policy_count
  FROM pg_policies
  GROUP BY schemaname, tablename
) p
  ON p.schemaname = n.nspname AND p.tablename = c.relname
WHERE c.relkind = 'r'
  AND n.nspname = 'public'
ORDER BY c.relname;


-- =========================================================
-- 2) All policies in public schema, full detail
-- =========================================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,           -- PERMISSIVE vs RESTRICTIVE
  roles,                -- roles the policy applies to
  cmd,                  -- SELECT / INSERT / UPDATE / DELETE / ALL
  qual        AS using_expression,       -- USING clause (read visibility)
  with_check  AS with_check_expression   -- WITH CHECK clause (write validity)
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;


-- =========================================================
-- 3) Risk list: tables where anon/authenticated access is
--    effectively unrestricted or completely blocked.
--    This is the quick "what must I fix" view.
-- =========================================================
WITH table_stats AS (
  SELECT
    n.nspname AS schema_name,
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled,
    COALESCE((
      SELECT COUNT(*) FROM pg_policies
      WHERE schemaname = n.nspname AND tablename = c.relname
    ), 0) AS policy_count
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE c.relkind = 'r' AND n.nspname = 'public'
)
SELECT
  table_name,
  CASE
    WHEN NOT rls_enabled THEN 'RLS DISABLED - every row readable/writable by anon+authenticated'
    WHEN rls_enabled AND policy_count = 0 THEN 'RLS ON, NO POLICIES - all non-service-role access denied'
  END AS issue
FROM table_stats
WHERE NOT rls_enabled
   OR policy_count = 0
ORDER BY table_name;
