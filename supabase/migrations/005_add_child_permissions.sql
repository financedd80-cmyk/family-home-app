-- ============================================================================
-- 005_add_child_permissions.sql
--
-- Prepares RLS for role = 'child' members marking their own tasks done, while
-- everything else (approving, rejecting, editing points, editing tasks,
-- managing family_members, reward_rules) stays exactly as restrictive as it
-- was after 003/004 — i.e. admin/parent only.
--
-- Background: דניאל, דור and דוראל are role = 'child', can_login = false
-- today. This migration does NOT flip can_login or create any auth.users
-- rows — it only prepares the policies so that, once a child is later given
-- a real Supabase Auth login (a separate, deliberate step), they immediately
-- get exactly this level of access and no more.
--
-- What a child can already do without any change here (existing select
-- policies from 001/003 are role-agnostic — any active member of the family
-- can read these, so children were already covered):
--   - read their family                    ("Members can view their own family")
--   - read the other family_members         ("Members can view other members in their family")
--   - read the family's tasks               ("Members can view tasks in their family")
--
-- What this migration adds:
--   - three helper functions, matching the shape of the existing
--     current_user_is_admin() / current_user_is_parent_or_admin() helpers
--     from 003/004
--   - exactly one new write policy: a child may update a task that is
--     currently 'open' and assigned to them, and only to flip it to
--     'pending_approval' (never straight to 'approved' — approval always
--     stays an admin/parent action). This mirrors how the app already calls
--     updateTaskStatus() when a child marks a task done (see
--     src/app/page.tsx handleMarkDone — requiresApproval is always true for
--     a child-assigned task, so it already only ever requests
--     'pending_approval' for them).
--   - a BEFORE UPDATE trigger that locks every other column of the row for a
--     child's update. RLS's `with check` only constrains the values in the
--     row being written, it can't by itself guarantee *which* columns changed
--     — without this trigger a child could bundle a points/title/etc. change
--     into the same update call as long as the final row still satisfied
--     `with check`. The trigger is a no-op for admin/parent (and for
--     anything running outside a child's session).
--
-- Explicitly NOT added here (unchanged from 003/004, on purpose):
--   - no update/insert policy for family_members (stays admin-only)
--   - no insert policy for reward_transactions for child (stays admin/parent-only)
--   - no insert/update policy for reward_rules for child (stays admin-only)
--   - no delete policy anywhere, for any role
--   - nothing for דיקלה (admin) or דודו (parent) is touched
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Helper functions (security definer, same pattern as 003/004 — read
-- family_members without recursing through family_members' own RLS).
-- ----------------------------------------------------------------------------

create or replace function public.current_user_is_child()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_user_role() = 'child', false);
$$;

-- Mirrors current_user_is_parent_or_admin() from 004 under a name that
-- reads as "may manage tasks" (create/edit/approve/reject any task in the
-- family). Existing 003/004 policies keep using
-- current_user_is_parent_or_admin() directly — this is not a rename, it's an
-- additional name for readability in app-level code/docs that talk about
-- "who can manage tasks" without needing to know the admin/parent split.
create or replace function public.current_user_can_manage_tasks()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_user_is_parent_or_admin();
$$;

-- True for a role that may only ever mark its OWN assigned task done (child
-- today), as opposed to current_user_can_manage_tasks(), which can touch any
-- task in the family. Used below in the child update policy/trigger.
create or replace function public.current_user_can_complete_own_tasks()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_user_is_child();
$$;

grant execute on function public.current_user_is_child() to authenticated;
grant execute on function public.current_user_can_manage_tasks() to authenticated;
grant execute on function public.current_user_can_complete_own_tasks() to authenticated;


-- ----------------------------------------------------------------------------
-- tasks: a child may flip their own OPEN task to PENDING_APPROVAL only.
--
-- Note the actual column name is `assigned_to_member_id` (see
-- 001_initial_family_app_schema.sql) — there is no `completed_at` column on
-- `tasks`; "marking done" in this app is represented purely by the status
-- transition open -> pending_approval (see src/app/page.tsx handleMarkDone),
-- so nothing else needs to change on the row.
--
-- This is a separate, additive policy: Postgres ORs permissive policies for
-- the same command together, so this does not weaken or replace the
-- admin/parent update policy from 004 ("Admins and parents can update tasks
-- in their family") — it only grants this one narrow case to children, who
-- that policy already excludes.
-- ----------------------------------------------------------------------------

drop policy if exists "Children can mark their own open tasks pending approval" on public.tasks;
create policy "Children can mark their own open tasks pending approval"
  on public.tasks for update
  using (
    family_id = public.current_user_family_id()
    and public.current_user_can_complete_own_tasks()
    and assigned_to_member_id = public.current_user_family_member_id()
    and status = 'open'
  )
  with check (
    family_id = public.current_user_family_id()
    and public.current_user_can_complete_own_tasks()
    and assigned_to_member_id = public.current_user_family_member_id()
    and status = 'pending_approval'
  );


-- ----------------------------------------------------------------------------
-- tasks: lock every other column when the caller is a child.
--
-- Without this, a child's update call could satisfy the `with check` above
-- (final status = 'pending_approval', still their own task) while also
-- smuggling in changes to points, title, assigned_to_member_id, etc. in the
-- same statement. This trigger rejects any such update outright. It is a
-- no-op for admin/parent (and for the seed script / any non-child caller).
-- ----------------------------------------------------------------------------

create or replace function public.enforce_child_task_completion_only()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not public.current_user_is_child() then
    return new;
  end if;

  if old.status is distinct from 'open' or new.status is distinct from 'pending_approval' then
    raise exception 'Children may only mark an open task as pending_approval.';
  end if;

  if new.family_id is distinct from old.family_id
     or new.title is distinct from old.title
     or new.description is distinct from old.description
     or new.type is distinct from old.type
     or new.assigned_to_member_id is distinct from old.assigned_to_member_id
     or new.created_by_member_id is distinct from old.created_by_member_id
     or new.date is distinct from old.date
     or new.start_time is distinct from old.start_time
     or new.end_time is distinct from old.end_time
     or new.points is distinct from old.points
     or new.requires_approval is distinct from old.requires_approval
     or new.approved_by_member_id is distinct from old.approved_by_member_id
     or new.approved_at is distinct from old.approved_at
     or new.is_recurring is distinct from old.is_recurring
     or new.recurrence is distinct from old.recurrence
     or new.notes is distinct from old.notes
     or new.deleted_at is distinct from old.deleted_at
  then
    raise exception 'Children may only change a task''s status when marking it done.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_child_task_completion_only on public.tasks;
create trigger enforce_child_task_completion_only
  before update on public.tasks
  for each row execute function public.enforce_child_task_completion_only();


-- ----------------------------------------------------------------------------
-- Everything below is an explicit reminder of what stays untouched by this
-- migration (no SQL here, just documenting scope for the next reader):
--
--   - families: no write policy for anyone but bootstrap (unchanged since 001).
--   - family_members: only "Admins can update family members in their family"
--     exists (003) — a child cannot update family_members, including their
--     own row (e.g. cannot flip their own can_login or role).
--   - reward_transactions: only admin/parent can insert (004); no update
--     policy for anyone (append-only ledger, unchanged since 001).
--   - reward_rules: only admin can insert/update (003); unchanged.
--   - No delete policy exists on any table, for any role. Still true here.
-- ============================================================================
