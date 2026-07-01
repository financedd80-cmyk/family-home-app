# Supabase — Initial Schema Plan

This folder contains the **initial database design** for `family-home-app`.

Nothing in this folder is connected to the app yet. There is no Supabase
client in the codebase, no `.env.local`, and no Auth wiring. This is schema
planning, meant to be reviewed before anything is run against a real
Supabase project.

Status: the tables from `001_initial_family_app_schema.sql` have already
been created in the Supabase project. `002_seed_initial_family.sql` (see
"Bootstrap" below) has been prepared but **not yet run**.

## What's in `migrations/001_initial_family_app_schema.sql`

Creates 10 tables:

1. **families** — a family workspace (name, timezone).
2. **family_members** — people in a family, including children who have no
   login (`can_login` / `auth_user_id` are optional).
3. **tasks** — the central table: home tasks, events, transportation,
   medical/appointments, and general items. Includes approval flow fields
   (`requires_approval`, `approved_by_member_id`, `approved_at`) and
   recurrence fields.
4. **transportation_details** — extra fields for `tasks` where
   `type = 'transportation'` (pickup/return people, times, locations).
5. **reward_transactions** — append-only points history (earned, bonus,
   adjustment, weekly/all-time reset, removed). Balances should be computed
   by summing this table, not by reading task status.
6. **reward_rules** — default point values per task type, for future use
   when creating tasks (e.g. "unload dishwasher = 1 point").
7. **activity_log** — free-form audit trail (`action_type`, `metadata`
   jsonb) for things that happen in the app.
8. **calendar_connections** — placeholder for a future personal-calendar
   integration. No OAuth tokens are stored at this stage.
9. **calendar_import_rules** — filtering rules for what gets pulled in from
   an external calendar.
10. **calendar_import_queue** — external calendar events waiting for
    approval before becoming real tasks. Nothing auto-imports.

Every table has `created_at`, and tables that make sense to edit also have
`updated_at`, kept current automatically via a shared `set_updated_at()`
trigger function.

Useful indexes are included on the foreign keys and columns the app is
expected to filter/sort by most often (`family_id`, `date`, `status`, `deleted_at`, etc).

### Data Retention Policy

Family data is meant to be kept, not thrown away. The schema is built around
soft delete and append-only history rather than physical deletion:

- **Data is kept over time.** Nothing in normal app usage physically deletes
  a family, a family member, a task, or a calendar item.
- **Tasks, family members, calendar items, etc. are not physically deleted
  from the app.** `families`, `family_members`, `tasks`,
  `transportation_details`, `reward_rules`, `calendar_connections`,
  `calendar_import_rules`, and `calendar_import_queue` each have a
  `deleted_at timestamptz` column. The app "deletes" a row by setting this
  timestamp; the row stays in the database but is filtered out by the RLS
  `select` policies (which all check `deleted_at is null`).
- **`activity_log` is used to record actions.** It has no `deleted_at` —
  entries are written once and kept.
- **`reward_transactions` is used to record points, resets, and
  corrections.** It also has no `deleted_at`. A member's balance is the sum
  of their rows in this table, never a value that gets edited in place.
- **Resetting points does not delete history.** A weekly or all-time reset
  is written as its own `reward_transactions` row
  (`transaction_type = 'weekly_reset'` or `'all_time_reset'`), so everything
  earned before the reset is still visible in the history.
- Cancelling a task is a separate concept from deleting it: cancellation is
  `status = 'cancelled'` on a task that otherwise still exists and is still
  visible; `deleted_at` is only for hiding a row the family doesn't want to
  see at all.
- A real SQL `DELETE` is treated as a rare, deliberate maintenance action
  outside normal app usage, not something the app ever issues. The
  migration file documents, table by table, what `on delete cascade` /
  `restrict` / `set null` behavior would apply if that ever happened (see
  the "Data retention & deletion policy" comment near the top of
  `001_initial_family_app_schema.sql`). Notably, `reward_transactions` and
  `activity_log` are protected from silently losing data this way: deleting
  a family member is blocked while their point history exists
  (`on delete restrict`), and deleting a task only clears the link from
  existing history rows (`on delete set null`) rather than deleting the
  history itself.

### Row Level Security

RLS is **enabled on every table**. The migration includes conservative
`select`-only policies scoped to "the caller is an active member of this
family" (matched via `family_members.auth_user_id = auth.uid()`). There are
intentionally **no insert/update/delete policies yet** — until Supabase Auth
is connected and tested, writes are expected to go through the service role
(trusted server-side code), which bypasses RLS.

This is a starting point, not a final authorization model. See the `TODO`
comment block right above the `alter table ... enable row level security`
statements in the SQL file for what's still open (admin-only actions,
whether unauthenticated children need a different access model, etc).

## Order to run

1. `migrations/001_initial_family_app_schema.sql` — **already run.**
2. `migrations/002_seed_initial_family.sql` — prepared, **not yet run**
   (needs a manual edit first — see "Bootstrap" below).

Future schema changes should be added as new numbered files
(`003_...sql`, ...) rather than editing either of these once they've
actually been run somewhere.

## Bootstrap: seeding the first family (`002_seed_initial_family.sql`)

This is a one-off seed script (not a repeatable schema migration) that
creates the app's first real data:

- One row in `families`: **משפחת גורן בן חיים**.
- Five rows in `family_members` under that family:
  - **דיקלה** — `admin`
  - **דודו** — `parent`
  - **דניאל** — `child`
  - **דור** — `child`
  - **דוראל** — `child`

Only דיקלה is linked to a real Supabase Auth account (`auth_user_id`) — she's
the one who needs to log in first as the admin. The rest are `family_members`
rows without logins for now, same as any child in this schema; they can be
connected to real Auth accounts later the same way, in a future seed/step.

### Before running it

1. **דיקלה must already have a Supabase Auth account.** Create one first
   (she signs up normally, or an admin creates her under
   Authentication → Users in the Supabase Dashboard) if she doesn't have one
   yet — the script looks her up by email, it doesn't create her account.
2. Open `002_seed_initial_family.sql` and replace the placeholder at the top
   of the `do $$ ... $$` block:
   ```sql
   v_dikla_email text := 'REPLACE_WITH_DIKLA_EMAIL@example.com';
   ```
   with her real login email.
3. To double check her auth id yourself (optional — the script does this
   lookup automatically): Supabase Dashboard → Authentication → Users →
   find her row → the **UID** column is `auth.users.id`. Or run
   `select id, email from auth.users where email = 'her-email@example.com';`
   in the SQL Editor.
4. Run the whole file once in the Supabase SQL Editor.

The script is defensive: it raises an exception (no rows written) if the
placeholder email wasn't replaced / doesn't match any `auth.users` row, and
also if a family named **משפחת גורן בן חיים** already exists, so accidentally
running it twice won't create duplicate data.

## Before running any migration in this folder

- Read through the table definitions and constraints and confirm they match
  the app's actual needs.
- Double-check the `check` constraints on `type`, `status`, `role`,
  `recurrence`, `transaction_type`, `provider`, `rule_type`, `action`, and
  `calendar_import_queue.status` — these enums are only as good as this
  plan; the app doesn't validate against them yet.
- Confirm the RLS policies make sense for the intended access model before
  relying on them for anything real, including the added `deleted_at is null`
  filters.
- Confirm the `on delete restrict` on `reward_transactions.member_id` and the
  `on delete set null` on `reward_transactions.task_id` / `activity_log.task_id`
  match the intended data retention behavior described above.

## What's still NOT connected after this migration exists

Creating these tables does not, by itself, do any of the following:

- **Auth** — Supabase Auth is not set up. `family_members.auth_user_id` and
  `families.created_by` are bare nullable `uuid` columns with no foreign key
  to `auth.users` yet.
- **Supabase client** — no `@supabase/supabase-js` (or similar) dependency,
  no client instance, no environment variables.
- **Saving tasks / any app data** — the app's screens (calendar, tasks,
  transportation, scoring, family tab) still use their current in-memory /
  demo data. Nothing reads from or writes to these tables yet.
- **Calendar connection** — `calendar_connections`,
  `calendar_import_rules`, and `calendar_import_queue` are schema-only. No
  OAuth flow, no token storage, no sync job exists.

## Suggested next steps (not part of this stage)

1. Create דיקלה's Supabase Auth account (if not already done) and run
   `002_seed_initial_family.sql` after filling in her email.
2. Add the Supabase client and environment variables.
3. Wire up Auth and decide how the other family members (דודו, and
   eventually the kids) get connected to their own Auth accounts.
4. Connect one screen at a time (likely `family_members` and `tasks` first)
   to real data, replacing demo/in-memory state incrementally.
5. Revisit RLS policies with real `auth.uid()` values before trusting them.
