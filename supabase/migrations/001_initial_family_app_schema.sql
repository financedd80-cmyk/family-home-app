-- ============================================================================
-- 001_initial_family_app_schema.sql
--
-- Initial Supabase schema for the family-home-app project.
--
-- This migration ONLY creates tables, constraints, indexes, and RLS scaffolding.
-- It does NOT create any policies beyond conservative defaults, and it does NOT
-- wire the app up to Supabase in any way. See supabase/README.md for context
-- and next steps before running this against a real project.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;


-- ----------------------------------------------------------------------------
-- Shared trigger function: keep updated_at current on every row update.
-- Attached individually to every table below that has an updated_at column.
-- ----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ----------------------------------------------------------------------------
-- Data retention & deletion policy
--
-- Family data (calendars, tasks, scoring history) is meant to persist over
-- time and never disappear by accident. The app is expected to follow these
-- rules; the schema below is built to support them:
--
--   * "Deleting" a family, family member, task, transportation detail,
--     reward rule, or calendar connection/rule/queue item from the app
--     means setting its `deleted_at` timestamp, not issuing a SQL DELETE.
--     Soft-deleted rows stay in the database and are simply hidden from
--     normal reads (see the RLS policies below, which filter on
--     `deleted_at is null`).
--   * Cancelling a task is done via `status = 'cancelled'`, not by deleting
--     the row (soft or otherwise).
--   * Points are never deleted or overwritten in place. Every change to a
--     member's score (earning, bonus, manual adjustment, or reset) is
--     recorded as a new row in `reward_transactions`. A balance is always
--     the sum of that table's rows for a member, so history is preserved.
--   * Resetting points (weekly or all-time) does not erase prior
--     transactions — it is recorded as its own `reward_transactions` row
--     with `transaction_type = 'weekly_reset'` or `'all_time_reset'`.
--   * `reward_transactions` and `activity_log` are append-only history
--     tables and intentionally do NOT have a `deleted_at` column — rows in
--     them are not meant to be hidden or removed via the app.
--   * A real SQL DELETE (hard delete) is only expected to happen as a rare,
--     deliberate maintenance/admin action outside normal app usage — see
--     the per-table notes on `on delete` behavior below for what happens
--     to related rows in that case.
-- ----------------------------------------------------------------------------


-- ============================================================================
-- 1. families
-- A single family "workspace". Everything else hangs off family_id.
-- ============================================================================

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'Asia/Jerusalem',
  -- created_by will reference auth.users(id) once Supabase Auth is connected.
  -- Left as a bare nullable uuid for now to avoid coupling this migration to Auth setup.
  created_by uuid,
  -- Soft delete: the app sets this instead of issuing a DELETE. A hard
  -- SQL DELETE of a family is a rare admin/maintenance action, and cascades
  -- to family_members/tasks/etc below on purpose in that case (see the
  -- "Data retention & deletion policy" note above).
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_families_deleted_at on public.families(deleted_at);

create trigger set_updated_at
  before update on public.families
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 2. family_members
-- People belonging to a family. Not every member has a login (e.g. children).
-- ============================================================================

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  display_name text not null,
  role text not null,
  color text,
  avatar_url text,
  can_login boolean not null default false,
  -- auth_user_id will reference auth.users(id) once Supabase Auth is connected.
  auth_user_id uuid,
  is_active boolean not null default true,
  -- Soft delete: the app sets this instead of issuing a DELETE (a member
  -- who leaves the family is hidden, not erased, so their history in
  -- reward_transactions / activity_log stays intact and attributable).
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint family_members_role_check
    check (role in ('admin', 'parent', 'child'))
);

create index if not exists idx_family_members_family_id
  on public.family_members(family_id);
create index if not exists idx_family_members_deleted_at
  on public.family_members(deleted_at);
create index if not exists idx_family_members_family_id_deleted_at
  on public.family_members(family_id, deleted_at);

create trigger set_updated_at
  before update on public.family_members
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 3. tasks
-- The central table: home tasks, events, transportation, appointments, etc.
-- ============================================================================

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  description text,
  type text not null,
  status text not null default 'open',
  assigned_to_member_id uuid references public.family_members(id),
  created_by_member_id uuid references public.family_members(id),
  date date not null,
  start_time time,
  end_time time,
  points integer not null default 0,
  requires_approval boolean not null default true,
  approved_by_member_id uuid references public.family_members(id),
  approved_at timestamptz,
  is_recurring boolean not null default false,
  recurrence text not null default 'none',
  notes text,
  -- Soft delete: the app sets this instead of issuing a DELETE. Note this is
  -- distinct from cancelling a task, which is a normal, visible outcome
  -- recorded via status = 'cancelled' — deleted_at is only for hiding a
  -- task the family no longer wants to see at all (e.g. created by mistake).
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tasks_title_not_blank check (btrim(title) <> ''),
  constraint tasks_points_non_negative check (points >= 0),
  constraint tasks_type_check
    check (type in ('home_task', 'event', 'transportation', 'medical', 'general')),
  constraint tasks_status_check
    check (status in ('open', 'done', 'pending_approval', 'approved', 'rejected', 'cancelled')),
  constraint tasks_recurrence_check
    check (recurrence in ('none', 'daily', 'weekly', 'monthly', 'yearly'))
);

create index if not exists idx_tasks_family_id on public.tasks(family_id);
create index if not exists idx_tasks_date on public.tasks(date);
create index if not exists idx_tasks_assigned_to_member_id on public.tasks(assigned_to_member_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_deleted_at on public.tasks(deleted_at);
create index if not exists idx_tasks_family_id_deleted_at on public.tasks(family_id, deleted_at);

create trigger set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 4. transportation_details
-- Extra fields for tasks of type = 'transportation'.
-- Not enforced at the DB level yet (would require a trigger) to keep this
-- migration simple; enforce in application logic for now.
--
-- task_id keeps `on delete cascade` intentionally: this row has no meaning
-- without its parent task. The app never hard-deletes tasks (see the "Data
-- retention & deletion policy" note above — tasks are soft-deleted via
-- deleted_at instead), so this cascade only fires during a rare, deliberate
-- maintenance hard-delete of a task, where losing the transportation detail
-- alongside it is the desired outcome.
-- ============================================================================

create table if not exists public.transportation_details (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  passenger_member_id uuid references public.family_members(id),
  pickup_by_member_id uuid references public.family_members(id),
  return_by_member_id uuid references public.family_members(id),
  pickup_location text,
  dropoff_location text,
  pickup_time time,
  return_time time,
  notes text,
  -- Soft delete: the app sets this instead of issuing a DELETE.
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_transportation_details_task_id
  on public.transportation_details(task_id);
create index if not exists idx_transportation_details_deleted_at
  on public.transportation_details(deleted_at);

create trigger set_updated_at
  before update on public.transportation_details
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 5. reward_transactions
-- Append-only history of points. Current balance should be derived from this
-- table (sum of points per member), not from task status alone.
--
-- No deleted_at here on purpose: this is a history table, not something the
-- app hides or edits in place (see the "Data retention & deletion policy"
-- note above). Resets and corrections are new rows, never deletions.
--
-- On delete behavior review (this table is exactly what that history
-- policy is meant to protect):
--   * family_id keeps `on delete cascade` — it only fires if the entire
--     family is hard-deleted (a deliberate full purge outside normal app
--     usage), at which point there is nothing left for this history to
--     belong to.
--   * member_id uses `on delete restrict` (not cascade): a family_member
--     row is only ever hard-deleted as a rare, surgical maintenance action
--     while the rest of the family remains, and that must NOT silently wipe
--     that person's point history. The delete is blocked until the
--     transactions are consciously handled.
--   * task_id uses `on delete set null`: if a task is ever hard-deleted,
--     the points already recorded for it must survive — only the link back
--     to the (now gone) task is cleared.
-- ============================================================================

create table if not exists public.reward_transactions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid not null references public.family_members(id) on delete restrict,
  task_id uuid references public.tasks(id) on delete set null,
  points integer not null,
  transaction_type text not null,
  reason text,
  created_by_member_id uuid references public.family_members(id),
  created_at timestamptz not null default now(),

  constraint reward_transactions_type_check
    check (transaction_type in (
      'earned', 'bonus', 'adjustment', 'weekly_reset', 'all_time_reset', 'removed'
    ))
);

create index if not exists idx_reward_transactions_family_id
  on public.reward_transactions(family_id);
create index if not exists idx_reward_transactions_member_id
  on public.reward_transactions(member_id);
create index if not exists idx_reward_transactions_task_id
  on public.reward_transactions(task_id);


-- ============================================================================
-- 6. reward_rules
-- Default point values for common task types (e.g. "unload dishwasher" = 1).
-- ============================================================================

create table if not exists public.reward_rules (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  task_type text,
  default_points integer not null default 0,
  is_active boolean not null default true,
  created_by_member_id uuid references public.family_members(id),
  -- Soft delete: the app sets this instead of issuing a DELETE.
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reward_rules_deleted_at
  on public.reward_rules(deleted_at);

create trigger set_updated_at
  before update on public.reward_rules
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 7. activity_log
-- Free-form audit trail of things that happened in a family's workspace.
--
-- No deleted_at here on purpose: like reward_transactions, this is an
-- append-only history table (see the "Data retention & deletion policy"
-- note above). task_id uses `on delete set null` so a rare hard-delete of a
-- task clears the link but keeps the log entry describing what happened.
-- ============================================================================

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  member_id uuid references public.family_members(id),
  action_type text not null,
  description text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_log_family_id on public.activity_log(family_id);


-- ============================================================================
-- 8. calendar_connections
-- Future personal-calendar integration. No tokens are stored in this stage.
-- ============================================================================

create table if not exists public.calendar_connections (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid not null references public.family_members(id) on delete cascade,
  provider text not null,
  display_name text,
  is_active boolean not null default true,
  sync_enabled boolean not null default false,
  -- Soft delete: the app sets this instead of issuing a DELETE.
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint calendar_connections_provider_check
    check (provider in ('google', 'apple', 'samsung', 'outlook', 'local_device', 'other'))

  -- NOTE: no access_token / refresh_token columns yet on purpose.
  -- When real OAuth sync is implemented, tokens must be stored encrypted
  -- (e.g. via Supabase Vault or an encrypted column), never in plain text.
);

create index if not exists idx_calendar_connections_family_id
  on public.calendar_connections(family_id);
create index if not exists idx_calendar_connections_deleted_at
  on public.calendar_connections(deleted_at);

create trigger set_updated_at
  before update on public.calendar_connections
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 9. calendar_import_rules
-- Filtering rules applied to incoming personal-calendar events before they
-- are ever suggested to the family.
-- ============================================================================

create table if not exists public.calendar_import_rules (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.calendar_connections(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  rule_type text not null,
  rule_value text,
  action text not null,
  is_active boolean not null default true,
  -- Soft delete: the app sets this instead of issuing a DELETE.
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint calendar_import_rules_type_check
    check (rule_type in ('keyword', 'calendar_name', 'member_name', 'event_type', 'private_filter')),
  constraint calendar_import_rules_action_check
    check (action in ('include', 'exclude', 'require_approval', 'private_only'))
);

create index if not exists idx_calendar_import_rules_deleted_at
  on public.calendar_import_rules(deleted_at);

create trigger set_updated_at
  before update on public.calendar_import_rules
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 10. calendar_import_queue
-- Events pulled from an external calendar, awaiting review before becoming
-- a real task. Default posture: private by default, nothing auto-imports.
-- ============================================================================

create table if not exists public.calendar_import_queue (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  connection_id uuid references public.calendar_connections(id),
  source_event_id text,
  title text not null,
  description text,
  start_at timestamptz,
  end_at timestamptz,
  location text,
  status text not null default 'pending',
  suggested_task_type text,
  assigned_to_member_id uuid references public.family_members(id),
  raw_payload jsonb,
  -- Soft delete: the app sets this instead of issuing a DELETE.
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint calendar_import_queue_status_check
    check (status in ('pending', 'approved', 'ignored', 'imported'))
);

create index if not exists idx_calendar_import_queue_family_id
  on public.calendar_import_queue(family_id);
create index if not exists idx_calendar_import_queue_status
  on public.calendar_import_queue(status);
create index if not exists idx_calendar_import_queue_deleted_at
  on public.calendar_import_queue(deleted_at);

create trigger set_updated_at
  before update on public.calendar_import_queue
  for each row execute function public.set_updated_at();


-- ============================================================================
-- Row Level Security
--
-- RLS is enabled on every table now so that no table is accidentally left
-- open. The policies below are intentionally conservative and use only
-- `family_members.auth_user_id` to figure out which family a caller belongs
-- to. They are a starting point, NOT a final authorization model.
--
-- TODO (next stage, once Supabase Auth is actually connected):
--   - Revisit these policies together with real auth.uid() testing.
--   - Add explicit policies for admin-only actions (e.g. hard-deleting a
--     family, managing reward_rules, approving tasks).
--   - Decide whether children without auth_user_id should read via a
--     shared "family session" instead of per-user auth (product decision).
--
-- Soft delete note: every select policy below filters out rows where the
-- table's own `deleted_at` is set, and requires the caller's own
-- family_members row to have `deleted_at is null` too, so a removed member
-- loses access and soft-deleted rows stay invisible without needing to be
-- hard-deleted. reward_transactions and activity_log have no `deleted_at`
-- (see the "Data retention & deletion policy" note above), so their
-- policies only check the caller's own membership row.
-- ============================================================================

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.tasks enable row level security;
alter table public.transportation_details enable row level security;
alter table public.reward_transactions enable row level security;
alter table public.reward_rules enable row level security;
alter table public.activity_log enable row level security;
alter table public.calendar_connections enable row level security;
alter table public.calendar_import_rules enable row level security;
alter table public.calendar_import_queue enable row level security;

-- Conservative baseline: a logged-in user may act on rows belonging to a
-- family they are an active member of (matched via auth_user_id). No public
-- (anon) access is granted anywhere.

create policy "Members can view their own family"
  on public.families for select
  using (
    families.deleted_at is null
    and exists (
      select 1 from public.family_members fm
      where fm.family_id = families.id
        and fm.auth_user_id = auth.uid()
        and fm.is_active
        and fm.deleted_at is null
    )
  );

create policy "Members can view other members in their family"
  on public.family_members for select
  using (
    family_members.deleted_at is null
    and exists (
      select 1 from public.family_members fm
      where fm.family_id = family_members.family_id
        and fm.auth_user_id = auth.uid()
        and fm.is_active
        and fm.deleted_at is null
    )
  );

create policy "Members can view tasks in their family"
  on public.tasks for select
  using (
    tasks.deleted_at is null
    and exists (
      select 1 from public.family_members fm
      where fm.family_id = tasks.family_id
        and fm.auth_user_id = auth.uid()
        and fm.is_active
        and fm.deleted_at is null
    )
  );

create policy "Members can view transportation details in their family"
  on public.transportation_details for select
  using (
    transportation_details.deleted_at is null
    and exists (
      select 1 from public.tasks t
      join public.family_members fm on fm.family_id = t.family_id
      where t.id = transportation_details.task_id
        and t.deleted_at is null
        and fm.auth_user_id = auth.uid()
        and fm.is_active
        and fm.deleted_at is null
    )
  );

create policy "Members can view reward transactions in their family"
  on public.reward_transactions for select
  using (
    exists (
      select 1 from public.family_members fm
      where fm.family_id = reward_transactions.family_id
        and fm.auth_user_id = auth.uid()
        and fm.is_active
        and fm.deleted_at is null
    )
  );

create policy "Members can view reward rules in their family"
  on public.reward_rules for select
  using (
    reward_rules.deleted_at is null
    and exists (
      select 1 from public.family_members fm
      where fm.family_id = reward_rules.family_id
        and fm.auth_user_id = auth.uid()
        and fm.is_active
        and fm.deleted_at is null
    )
  );

create policy "Members can view activity log in their family"
  on public.activity_log for select
  using (
    exists (
      select 1 from public.family_members fm
      where fm.family_id = activity_log.family_id
        and fm.auth_user_id = auth.uid()
        and fm.is_active
        and fm.deleted_at is null
    )
  );

create policy "Members can view calendar connections in their family"
  on public.calendar_connections for select
  using (
    calendar_connections.deleted_at is null
    and exists (
      select 1 from public.family_members fm
      where fm.family_id = calendar_connections.family_id
        and fm.auth_user_id = auth.uid()
        and fm.is_active
        and fm.deleted_at is null
    )
  );

create policy "Members can view calendar import rules in their family"
  on public.calendar_import_rules for select
  using (
    calendar_import_rules.deleted_at is null
    and exists (
      select 1 from public.family_members fm
      where fm.family_id = calendar_import_rules.family_id
        and fm.auth_user_id = auth.uid()
        and fm.is_active
        and fm.deleted_at is null
    )
  );

create policy "Members can view calendar import queue in their family"
  on public.calendar_import_queue for select
  using (
    calendar_import_queue.deleted_at is null
    and exists (
      select 1 from public.family_members fm
      where fm.family_id = calendar_import_queue.family_id
        and fm.auth_user_id = auth.uid()
        and fm.is_active
        and fm.deleted_at is null
    )
  );

-- NOTE: no insert/update/delete policies are defined yet on purpose.
-- Until Supabase Auth is connected and tested end-to-end, writes should
-- happen only via the service role (e.g. from trusted server-side code),
-- which bypasses RLS. Add scoped insert/update/delete policies as the next
-- stage of this plan, once real auth.uid() values exist to test against.
