# Supabase — Initial Schema Plan

This folder contains the **initial database design** for `family-home-app`.

Nothing in this folder is connected to the app yet. There is no Supabase
client in the codebase, no `.env.local`, and no Auth wiring. This is schema
planning, meant to be reviewed before anything is run against a real
Supabase project.

Status:
- `001_initial_family_app_schema.sql` — tables created.
- `002_seed_initial_family.sql` — run; the first family and its members
  exist, with דיקלה linked to her Supabase Auth account as admin.
- `003_fix_rls_recursion_and_write_policies.sql` — the infinite-recursion
  RLS bug (see below) was already hand-patched directly in Supabase to
  unblock development. This file formalizes that fix plus new write
  policies, but has **not been run from this file** — review it against
  the live hand-patch before running it (see "Before running any migration"
  below).
- The app (`src/`) is connected to Supabase: real login, and tasks/
  transportation are read from and written to the database. See "What's
  connected now" below for exactly what that covers.

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

RLS is **enabled on every table**. As originally written in this file, the
`select` policies scoped access via a `family_members` subquery — which
turned out to be broken: `family_members`' own policy queried
`family_members` again to evaluate itself, causing infinite recursion. That
was patched by hand in Supabase; `003_fix_rls_recursion_and_write_policies.sql`
is that fix written down properly (see below), plus the write policies the
app now needs.

This is still not a final authorization model — see the `TODO` at the
bottom of `003_fix_rls_recursion_and_write_policies.sql` for what's
deliberately deferred (e.g. non-admin members writing their own data).

## Order to run

1. `migrations/001_initial_family_app_schema.sql` — **already run.**
2. `migrations/002_seed_initial_family.sql` — **already run.**
3. `migrations/003_fix_rls_recursion_and_write_policies.sql` — **not run
   from this file yet** (the fix it contains was already applied by hand;
   review before running — see below).

Future schema changes should be added as new numbered files
(`004_...sql`, ...) rather than editing any of these once they've actually
been run somewhere.

## Migration 003: RLS recursion fix + write policies

`003_fix_rls_recursion_and_write_policies.sql` does two things:

1. **Fixes the recursion.** Adds four `security definer` helper functions —
   `current_user_family_id()`, `current_user_family_member_id()`,
   `current_user_role()`, `current_user_is_admin()` — that read the
   caller's own `family_members` row while bypassing RLS internally (that's
   what breaks the cycle). Every `select` policy on every table is rewritten
   to call `current_user_family_id()` instead of running a `family_members`
   subquery directly.
2. **Adds write policies**, since the app now saves real data instead of
   demo data. For this stage they're deliberately narrow: every insert/update
   requires `current_user_is_admin()` (today only דיקלה has a login, so
   that's the only role that needs write access) and is scoped to the
   caller's own family. Tables that got insert/update policies: `tasks`,
   `transportation_details`, `reward_rules`, and update-only for
   `family_members`; `reward_transactions` got insert-only (it's an
   append-only ledger, so there's nothing to update). No table has a
   `delete` policy — RLS denies delete by default with none defined, which
   is intentional; the app never issues a real `DELETE` (see "Data
   Retention Policy" above).

Since the recursion fix was already applied by hand directly in Supabase,
**diff this file against the live policies before running it**, so it
formalizes what's actually there instead of silently overwriting a
different hand-patch.

## Bootstrap: seeding the first family (`002_seed_initial_family.sql`)

This was a one-off seed script (not a repeatable schema migration) — it has
already been run. It created:

- One row in `families` (see the file for the exact name used — it was
  edited after this was first written, so treat Supabase itself as the
  source of truth for the current family name, not this README).
- Five rows in `family_members` under that family: **דיקלה** (`admin`,
  linked to her real Supabase Auth account), **דודו** (`parent`), **דניאל**,
  **דור**, **דוראל** (`child`).

Only דיקלה is linked to a real Supabase Auth account (`auth_user_id`) and
can log in right now. The rest are `family_members` rows without logins for
now, same as any child in this schema; they can be connected to real Auth
accounts later the same way, in a future seed/step.

Since it already ran, don't re-run this file — it has a built-in guard that
raises an exception if a family with the same name already exists, so a
second run should fail safely rather than duplicate data, but there's no
reason to test that on the real project.

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

## What's connected now

- **Auth** — real Supabase Auth login/logout for דיקלה (`src/lib/supabaseClient.ts`,
  `src/hooks/useFamilySession.ts`, the login form in the "משפחה" tab).
- **Family / family members** — read from Supabase after login (families,
  family_members).
- **Tasks** — read, created, edited, and moved through their status flow
  (mark done → approve/reject/revert → cancel) against the real `tasks`
  table, once logged in. See `src/lib/family-app/tasksApi.ts` and the
  handlers in `src/app/page.tsx`.
- **Transportation details** — saved/updated alongside a task whenever its
  type is "הסעה" (`transportation_details`).
- **Internal calendar** — the "יומן" tab already renders whatever is in the
  shared `tasks` state, so once tasks come from Supabase, the calendar does
  too. No separate wiring needed there.
- **Reward transactions (partial)** — approving a task with `points > 0`
  records one `earned` row in `reward_transactions` (with a duplicate check
  by `task_id`, so re-approving doesn't double count). The points shown in
  the "ניקוד" tab are still computed from the in-memory task list, not from
  summing `reward_transactions`, and weekly/all-time resets are still
  in-memory only (not persisted as reset transactions) — see the `TODO`
  comment near the reward/points state in `src/app/page.tsx`.

## What's still NOT connected

- **Delete** — never used anywhere in the app; all "removal" is soft delete
  (`deleted_at`) or `status = 'cancelled'`, matching the Data Retention
  Policy above. There's no UI for soft-deleting a family member or task
  outright yet (cancelling a task is the closest equivalent today).
- **External calendar** — Google/Apple/Samsung/Outlook sync. `calendar_connections`,
  `calendar_import_rules`, and `calendar_import_queue` remain schema-only.
- **Full reward ledger** — see "Reward transactions (partial)" above; the
  ledger only grows on approval right now, it isn't yet the source of truth
  for balances or resets.
- **Other family members' logins** — only דיקלה can log in today; the rest
  of `family_members` still have no `auth_user_id`.
- **Fine-grained (non-admin) write access** — every write policy in
  `003_fix_rls_recursion_and_write_policies.sql` requires admin; see the
  `TODO` at the bottom of that file.

## Suggested next steps (not part of this stage)

1. Review and run `003_fix_rls_recursion_and_write_policies.sql` against
   Supabase (diffing it against whatever was hand-patched first).
2. Decide whether to finish wiring `reward_transactions` as the real source
   of truth for balances and resets, or keep it partial for longer.
3. Give the other family members real Supabase Auth logins and add
   non-admin write policies for what they should be able to do themselves
   (e.g. marking their own task done).
4. When ready, start on external calendar import (`calendar_connections` /
   `calendar_import_rules` / `calendar_import_queue`) — explicitly out of
   scope until asked for.
