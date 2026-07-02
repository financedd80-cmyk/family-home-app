-- ============================================================================
-- 006_calendar_creator_and_child_insert_policies.sql
--
-- Lets every connected family member — including a child — add their own
-- item (event / appointment / ride / home task / general) from the newly
-- interactive "יומן" tab, with the data actually persisted to Supabase.
--
-- Background: 003/004 already let admin/parent insert any task (and its
-- transportation_details) for anyone in the family. 005 later let a child
-- update (mark done) a task already assigned to them. Neither migration gave
-- a child permission to INSERT a task at all — this migration adds exactly
-- that, scoped to their own name only.
--
-- Two schema questions from the calendar feature turned out not to need any
-- schema change at all:
--   - "creator" tracking: tasks.created_by_member_id already exists (see
--     001_initial_family_app_schema.sql) and the app already fills it on
--     every insert (see insertFamilyTask in src/lib/family-app/tasksApi.ts).
--   - the form's new general "מיקום" (location) field reuses the
--     already-existing, previously-unused tasks.description column.
-- Neither needed a migration — only the app-level mapping changed
-- (src/lib/family-app/supabaseMappers.ts).
--
-- What this migration does NOT do:
--   - no delete policy, anywhere
--   - no change to admin/parent policies from 003/004 — they can still
--     insert/update a task or ride for ANY family member, unchanged
--   - no change to family_members / reward_rules / reward_transactions
--     policies — a child still cannot self-approve or self-score
--   - no change to the 005 "mark done" update policy/trigger — that
--     migration is about UPDATE, this one is about INSERT; they don't
--     overlap
-- ============================================================================


-- ----------------------------------------------------------------------------
-- tasks: a child may insert a task, but only:
--   - into their own family
--   - assigned to themselves (never to a sibling or parent)
--   - as a fresh, unapproved item: status = 'open', requires_approval = true,
--     no approver/approval timestamp set yet
--
-- requires_approval is forced true here (not left to the client) so a child
-- can never create a task that would let handleMarkDone
-- (src/app/page.tsx) skip straight to 'approved' for them — approval stays
-- an admin/parent action no matter what the insert request claims.
-- ----------------------------------------------------------------------------

drop policy if exists "Children can insert their own tasks" on public.tasks;
create policy "Children can insert their own tasks"
  on public.tasks for insert
  with check (
    family_id = public.current_user_family_id()
    and public.current_user_is_child()
    and assigned_to_member_id = public.current_user_family_member_id()
    and status = 'open'
    and requires_approval = true
    and approved_by_member_id is null
    and approved_at is null
  );


-- ----------------------------------------------------------------------------
-- transportation_details: a child adding a "הסעה" (ride) item needs this
-- table's insert to succeed too, or tasksApi.insertFamilyTask's second
-- insert call throws and the app surfaces an error (the task row itself
-- would already exist at that point, since it's a separate statement — this
-- policy exists precisely so that half-finished state can't happen).
--
-- transportation_details has no family_id/assignee column of its own, so
-- ownership is checked by joining back to the parent task, same as the
-- existing admin/parent policies from 003/004 already do.
-- ----------------------------------------------------------------------------

drop policy if exists "Children can insert transportation details for their own tasks" on public.transportation_details;
create policy "Children can insert transportation details for their own tasks"
  on public.transportation_details for insert
  with check (
    public.current_user_is_child()
    and exists (
      select 1 from public.tasks t
      where t.id = transportation_details.task_id
        and t.family_id = public.current_user_family_id()
        and t.assigned_to_member_id = public.current_user_family_member_id()
    )
  );


-- ----------------------------------------------------------------------------
-- Explicit reminder of what's deliberately unchanged (no SQL, just scope
-- notes for the next reader):
--   - a child still cannot insert into reward_transactions (points are only
--     ever credited when an admin/parent approves — see handleApprove in
--     src/app/page.tsx — and that path is unreachable for a child both in
--     the UI and via RLS, since the admin/parent update policy from 004
--     requires current_user_is_parent_or_admin()).
--   - a child can set an arbitrary `points` value on their own new task
--     (nothing here restricts it) — this is intentional, not an oversight:
--     the value is only a suggestion until an admin/parent approves it, and
--     approval is the only place points actually get credited.
--   - a child still cannot update family_members, reward_rules, or anyone
--     else's tasks (003/004/005 policies, unchanged).
--   - no delete policy exists on any table, for any role. Still true here.
-- ============================================================================
