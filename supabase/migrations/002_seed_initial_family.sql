-- ============================================================================
-- 002_seed_initial_family.sql
--
-- Bootstrap: creates the first real family ("משפחת גורן בן חיים") and its
-- first family_members rows, and links the admin member (דיקלה) to her
-- Supabase Auth user.
--
-- This is a one-off seed script, meant to be run once by hand in the
-- Supabase SQL Editor, NOT part of the automatic migration chain that gets
-- re-run. It does not touch the app — no Supabase client, no screens, no
-- components are affected by this file.
--
-- PREREQUISITE: דיקלה must already have a Supabase Auth account (e.g. she
-- signed up once via Supabase Auth, or an admin created her manually in
-- Authentication -> Users) before this script is run, because the script
-- looks her up in auth.users by email. If she doesn't have an account yet,
-- create one first, THEN run this script.
--
-- BEFORE RUNNING:
--   1. Below, replace the placeholder email
--      'REPLACE_WITH_DIKLA_EMAIL@example.com' with דיקלה's real login email.
--   2. To find/confirm a user's auth id (id column) in Supabase:
--        - Dashboard: Authentication -> Users -> find the row by email ->
--          the "UID" column is the auth.users.id (uuid) you need.
--        - Or, from the SQL Editor, run:
--            select id, email from auth.users where email = 'her-email@example.com';
--          This script does that lookup for you automatically — you only
--          need to supply the email below, not the uuid itself.
--   3. Run this whole file once in the Supabase SQL Editor.
--
-- This script refuses to run (raises an exception, no partial writes) if:
--   - the placeholder email was not replaced, or no auth.users row matches it
--   - a family with this name already exists (so re-running by accident
--     does not create duplicate seed data)
-- ============================================================================

do $$
declare
  -- STEP 1: EDIT THIS — דיקלה's real Supabase Auth login email.
  v_dikla_email text := 'REPLACE_WITH_DIKLA_EMAIL@example.com';

  v_dikla_auth_id uuid;
  v_family_id uuid;
begin
  -- Guard: don't seed twice.
  if exists (
    select 1 from public.families
    where name = 'משפחת גורן בן חיים'
      and deleted_at is null
  ) then
    raise exception
      'A family named "משפחת גורן בן חיים" already exists — aborting to avoid duplicate seed data.';
  end if;

  -- Look up דיקלה's auth user id by email instead of hardcoding a uuid,
  -- since her real auth_user_id doesn't exist until she has signed up.
  select id into v_dikla_auth_id
  from auth.users
  where email = v_dikla_email;

  if v_dikla_auth_id is null then
    raise exception
      'No auth.users row found for email %. Replace v_dikla_email at the top of this script with דיקלה''s real Supabase Auth email (she must already have an account), then re-run.',
      v_dikla_email;
  end if;

  -- Create the family.
  insert into public.families (name)
  values ('משפחת גורן בן חיים')
  returning id into v_family_id;

  -- Create the family members. Only דיקלה is linked to a real auth user and
  -- can log in right now — the rest get real logins in a later step.
  insert into public.family_members
    (family_id, display_name, role, can_login, auth_user_id)
  values
    (v_family_id, 'דיקלה', 'admin', true, v_dikla_auth_id),
    (v_family_id, 'דודו', 'parent', false, null),
    (v_family_id, 'דניאל', 'child', false, null),
    (v_family_id, 'דור', 'child', false, null),
    (v_family_id, 'דוראל', 'child', false, null);
end $$;
