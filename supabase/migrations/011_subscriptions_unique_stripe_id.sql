-- 011_subscriptions_unique_stripe_id.sql
-- Lets the Stripe webhook upsert into public.subscriptions instead of blindly
-- inserting.
--
-- checkout.session.completed and customer.subscription.created fire about a
-- second apart for the same subscription. Both branches write the same audit
-- row, so without a unique key on stripe_subscription_id they race and insert
-- it twice. (The five 'manual_entry' comp rows already in the table are that
-- same failure mode, repeated by hand.)
--
-- A plain UNIQUE constraint, not a partial unique index: PostgREST emits
-- ON CONFLICT (stripe_subscription_id) with no WHERE clause, which cannot infer
-- a partial index and would fail with 42P10. Standard Postgres UNIQUE treats
-- NULLs as distinct, so the comped rows (stripe_subscription_id IS NULL) are
-- unaffected and may remain many.
--
-- Verified before writing: 7 rows, 2 non-null stripe_subscription_id values,
-- no duplicates. The constraint applies without a cleanup step.

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conrelid = 'public.subscriptions'::regclass
       and conname  = 'subscriptions_stripe_subscription_id_key'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_stripe_subscription_id_key
      unique (stripe_subscription_id);
  end if;
end $$;
