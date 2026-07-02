-- ============================================================================
-- 003_fix_rls_recursion_and_write_policies.sql
--
-- Fixes the RLS infinite-recursion bug from 001 and adds the write policies
-- the app now needs (it moved from local demo data to real reads/writes).
--
-- Background: every select policy in 001 figured out "is the caller a member
-- of this family?" via `exists (select 1 from public.family_members fm
-- where ...)`. For the family_members table itself, that meant the policy
-- protecting family_members queried family_members again to evaluate itself
-- — infinite recursion. This was already patched by hand directly in
-- Supabase to unblock development; this migration is that same fix,
-- formalized as a reviewable file, plus the new write policies.
--
-- NOTE: since the live database was already hand-patched, review this
-- against whatever was changed by hand before running it, so this doesn't
-- silently clobber a different fix. It's written with `drop policy if
-- exists` + `create policy` so it's safe to (re)run once reviewed.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Helper functions
--
-- Each is `security definer`, so — unlike a normal query — it reads
-- family_members without going back through family_members' own RLS policy.
-- That's what breaks the recursion: every other policy below asks "what
-- family/role does the caller have?" via one of these functions instead of
-- re-running a family_members subquery under RLS.
--
-- This relies on the standard Supabase setup where these functions are
-- created (and thus owned) by the project's `postgres` role, which has
-- BYPASSRLS. If that's ever not the case, these functions would need
-- `set row_security = off` or an explicit BYPASSRLS grant to keep working.
-- ----------------------------------------------------------------------------

create or replace function public.current_user_family_member_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id
  from public.family_members
  where auth_user_id = auth.uid()
    and deleted_at is null
  limit 1;
$$;

create or replace function public.current_user_family_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select family_id
  from public.family_members
  where auth_user_id = auth.uid()
    and deleted_at is null
  limit 1;
$$;

create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role
  from public.family_members
  where auth_user_id = auth.uid()
    and deleted_at is null
  limit 1;
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

grant execute on function public.current_user_family_member_id() to authenticated;
grant execute on function public.current_user_family_id() to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_user_is_admin() to authenticated;


-- ----------------------------------------------------------------------------
-- Select policies — replaced to use the helper functions above instead of a
-- family_members subquery, on every table (not just family_members), since
-- every one of those subqueries was going through the same broken path.
--
-- Unchanged from 001: deleted_at is null is still required wherever the
-- table has that column (see the "Data retention & deletion policy" note in
-- 001_initial_family_app_schema.sql) — soft-deleted rows stay invisible.
-- ----------------------------------------------------------------------------

drop policy if exists "Members can view their own family" on public.families;
create policy "Members can view their own family"
  on public.families for select
  using (
    deleted_at is null
    and id = public.current_user_family_id()
  );

drop policy if exists "Members can view other members in their family" on public.family_members;
create policy "Members can view other members in their family"
  on public.family_members for select
  using (
    deleted_at is null
    and family_id = public.current_user_family_id()
  );

drop policy if exists "Members can view tasks in their family" on public.tasks;
create policy "Members can view tasks in their family"
  on public.tasks for select
  using (
    deleted_at is null
    and family_id = public.current_user_family_id()
  );

drop policy if exists "Members can view transportation details in their family" on public.transportation_details;
create policy "Members can view transportation details in their family"
  on public.transportation_details for select
  using (
    deleted_at is null
    and exists (
      select 1 from public.tasks t
      where t.id = transportation_details.task_id
        and t.deleted_at is null
        and t.family_id = public.current_user_family_id()
    )
  );

drop policy if exists "Members can view reward transactions in their family" on public.reward_transactions;
create policy "Members can view reward transactions in their family"
  on public.reward_transactions for select
  using (
    family_id = public.current_user_family_id()
  );

drop policy if exists "Members can view reward rules in their family" on public.reward_rules;
create policy "Members can view reward rules in their family"
  on public.reward_rules for select
  using (
    deleted_at is null
    and family_id = public.current_user_family_id()
  );

drop policy if exists "Members can view activity log in their family" on public.activity_log;
create policy "Members can view activity log in their family"
  on public.activity_log for select
  using (
    family_id = public.current_user_family_id()
  );

drop policy if exists "Members can view calendar connections in their family" on public.calendar_connections;
create policy "Members can view calendar connections in their family"
  on public.calendar_connections for select
  using (
    deleted_at is null
    and family_id = public.current_user_family_id()
  );

drop policy if exists "Members can view calendar import rules in their family" on public.calendar_import_rules;
create policy "Members can view calendar import rules in their family"
  on public.calendar_import_rules for select
  using (
    deleted_at is null
    and family_id = public.current_user_family_id()
  );

drop policy if exists "Members can view calendar import queue in their family" on public.calendar_import_queue;
create policy "Members can view calendar import queue in their family"
  on public.calendar_import_queue for select
  using (
    deleted_at is null
    and family_id = public.current_user_family_id()
  );


-- ----------------------------------------------------------------------------
-- Write policies (new)
--
-- The app now saves real data, so it needs insert/update policies, not just
-- select. Scope for this stage, deliberately narrow:
--   * Every write policy requires current_user_is_admin() — right now only
--     דיקלה (admin) has a login, so this is the only role that needs to
--     write. Once other family members get real logins, this will need
--     per-role policies (e.g. a child marking their own task done) — see
--     the TODO further down.
--   * Every write is scoped to the caller's own family via
--     current_user_family_id() (or, for transportation_details, via the
--     parent task's family) — nobody can write into another family's data.
--   * No public/anon access anywhere.
--   * No delete policies at all, on any table — the app never issues a real
--     DELETE. "Deleting" is done via deleted_at, and cancelling a task is
--     done via status = 'cancelled' (see the "Data retention & deletion
--     policy" note in 001_initial_family_app_schema.sql). With no delete
--     policy defined, RLS denies delete by default — that's intentional,
--     not an oversight.
--   * reward_transactions only gets an insert policy, no update — it's an
--     append-only ledger by design (see 001), so there's nothing to update.
-- ----------------------------------------------------------------------------

drop policy if exists "Admins can insert tasks in their family" on public.tasks;
create policy "Admins can insert tasks in their family"
  on public.tasks for insert
  with check (
    family_id = public.current_user_family_id()
    and public.current_user_is_admin()
  );

drop policy if exists "Admins can update tasks in their family" on public.tasks;
create policy "Admins can update tasks in their family"
  on public.tasks for update
  using (
    family_id = public.current_user_family_id()
    and public.current_user_is_admin()
  )
  with check (
    family_id = public.current_user_family_id()
    and public.current_user_is_admin()
  );

drop policy if exists "Admins can insert transportation details in their family" on public.transportation_details;
create policy "Admins can insert transportation details in their family"
  on public.transportation_details for insert
  with check (
    public.current_user_is_admin()
    and exists (
      select 1 from public.tasks t
      where t.id = transportation_details.task_id
        and t.family_id = public.current_user_family_id()
    )
  );

drop policy if exists "Admins can update transportation details in their family" on public.transportation_details;
create policy "Admins can update transportation details in their family"
  on public.transportation_details for update
  using (
    public.current_user_is_admin()
    and exists (
      select 1 from public.tasks t
      where t.id = transportation_details.task_id
        and t.family_id = public.current_user_family_id()
    )
  )
  with check (
    public.current_user_is_admin()
    and exists (
      select 1 from public.tasks t
      where t.id = transportation_details.task_id
        and t.family_id = public.current_user_family_id()
    )
  );

drop policy if exists "Admins can insert reward transactions in their family" on public.reward_transactions;
create policy "Admins can insert reward transactions in their family"
  on public.reward_transactions for insert
  with check (
    family_id = public.current_user_family_id()
    and public.current_user_is_admin()
  );

drop policy if exists "Admins can insert reward rules in their family" on public.reward_rules;
create policy "Admins can insert reward rules in their family"
  on public.reward_rules for insert
  with check (
    family_id = public.current_user_family_id()
    and public.current_user_is_admin()
  );

drop policy if exists "Admins can update reward rules in their family" on public.reward_rules;
create policy "Admins can update reward rules in their family"
  on public.reward_rules for update
  using (
    family_id = public.current_user_family_id()
    and public.current_user_is_admin()
  )
  with check (
    family_id = public.current_user_family_id()
    and public.current_user_is_admin()
  );

drop policy if exists "Admins can update family members in their family" on public.family_members;
create policy "Admins can update family members in their family"
  on public.family_members for update
  using (
    family_id = public.current_user_family_id()
    and public.current_user_is_admin()
  )
  with check (
    family_id = public.current_user_family_id()
    and public.current_user_is_admin()
  );

-- No write policies yet for: families, activity_log, calendar_connections,
-- calendar_import_rules, calendar_import_queue. The app doesn't write to
-- these at this stage (families is bootstrap-only so far; activity_log and
-- the calendar_* tables aren't wired up yet). Add policies for them when
-- something in the app actually needs to write there.

-- TODO (next stage, once family members other than דיקלה have real logins):
--   - Add narrower policies so a non-admin member can update only their own
--     assigned tasks in limited ways (e.g. open -> pending_approval when
--     marking their own task done), instead of everything being admin-only.
--   - Revisit whether children need their own write access at all, or
--     whether every write should keep going through an admin/parent.
-- ============================================================================
