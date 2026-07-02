-- ============================================================================
-- 004_add_parent_permissions.sql
--
-- Extends the write policies from 003 so `role = 'parent'` can do the app's
-- day-to-day task/transportation/scoring writes, not just `role = 'admin'`.
-- Background: דודו now has a real Supabase Auth login
-- (family_members.role = 'parent', can_login = true, auth_user_id set), so
-- the admin-only write policies from 003 would otherwise block him from
-- using the app at all.
--
-- What stays admin-only (unchanged from 003, not touched here):
--   - family_members updates (editing members, changing role/can_login/
--     auth_user_id) — "Admins can update family members in their family".
--   - reward_rules insert/update — "Admins can insert/update reward rules
--     in their family".
--   - Resetting all-time or weekly points isn't written to the database at
--     all yet (still in-memory only, see supabase/README.md), so there's no
--     policy for it here either — the admin-only restriction for that is
--     enforced in the UI (src/app/page.tsx) for now.
--
-- Still true for everyone, admin or parent: no delete policies exist on any
-- table (this migration doesn't add any), and every policy stays scoped to
-- the caller's own family via current_user_family_id() — a parent can't see
-- or write into another family's data any more than an admin could.
-- ============================================================================


create or replace function public.current_user_is_parent_or_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_user_role() in ('admin', 'parent'), false);
$$;

grant execute on function public.current_user_is_parent_or_admin() to authenticated;


-- ----------------------------------------------------------------------------
-- tasks: insert/update — admin or parent
-- ----------------------------------------------------------------------------

drop policy if exists "Admins can insert tasks in their family" on public.tasks;
drop policy if exists "Admins and parents can insert tasks in their family" on public.tasks;
create policy "Admins and parents can insert tasks in their family"
  on public.tasks for insert
  with check (
    family_id = public.current_user_family_id()
    and public.current_user_is_parent_or_admin()
  );

drop policy if exists "Admins can update tasks in their family" on public.tasks;
drop policy if exists "Admins and parents can update tasks in their family" on public.tasks;
create policy "Admins and parents can update tasks in their family"
  on public.tasks for update
  using (
    family_id = public.current_user_family_id()
    and public.current_user_is_parent_or_admin()
  )
  with check (
    family_id = public.current_user_family_id()
    and public.current_user_is_parent_or_admin()
  );


-- ----------------------------------------------------------------------------
-- transportation_details: insert/update — admin or parent
-- ----------------------------------------------------------------------------

drop policy if exists "Admins can insert transportation details in their family" on public.transportation_details;
drop policy if exists "Admins and parents can insert transportation details in their family" on public.transportation_details;
create policy "Admins and parents can insert transportation details in their family"
  on public.transportation_details for insert
  with check (
    public.current_user_is_parent_or_admin()
    and exists (
      select 1 from public.tasks t
      where t.id = transportation_details.task_id
        and t.family_id = public.current_user_family_id()
    )
  );

drop policy if exists "Admins can update transportation details in their family" on public.transportation_details;
drop policy if exists "Admins and parents can update transportation details in their family" on public.transportation_details;
create policy "Admins and parents can update transportation details in their family"
  on public.transportation_details for update
  using (
    public.current_user_is_parent_or_admin()
    and exists (
      select 1 from public.tasks t
      where t.id = transportation_details.task_id
        and t.family_id = public.current_user_family_id()
    )
  )
  with check (
    public.current_user_is_parent_or_admin()
    and exists (
      select 1 from public.tasks t
      where t.id = transportation_details.task_id
        and t.family_id = public.current_user_family_id()
    )
  );


-- ----------------------------------------------------------------------------
-- reward_transactions: insert — admin or parent (written when a task with
-- points > 0 is approved; still insert-only, it's an append-only ledger).
-- ----------------------------------------------------------------------------

drop policy if exists "Admins can insert reward transactions in their family" on public.reward_transactions;
drop policy if exists "Admins and parents can insert reward transactions in their family" on public.reward_transactions;
create policy "Admins and parents can insert reward transactions in their family"
  on public.reward_transactions for insert
  with check (
    family_id = public.current_user_family_id()
    and public.current_user_is_parent_or_admin()
  );

-- No changes below this line: family_members updates and reward_rules
-- insert/update remain admin-only, exactly as set in 003.
-- ============================================================================
