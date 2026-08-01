/*
# Create users table for WithMe! app

1. New Tables
- `users`
  - `id` (uuid, primary key, auto-generated)
  - `display_name` (text, not null) — user's chosen display name
  - `city` (text, not null, default 'Bangalore') — user's city
  - `gender` (text, not null, check male/female/other) — user's gender
  - `interests` (text array, default empty) — multi-select interests as Postgres text array
  - `availability` (jsonb, default empty object) — availability toggles stored as JSON
  - `trust_score` (numeric, default 5.0) — platform trust score
  - `meetup_count` (int, default 0) — number of meetups attended
  - `rating` (numeric, default 0) — user rating
  - `comfort_settings` (text, default 'both', check pair/group/both) — pairing comfort preference
  - `avatar_id` (text) — selected avatar identifier (avatar_01 through avatar_20)
  - `bio` (text) — user bio
  - `created_at` (timestamptz, default now) — record creation timestamp

2. Security
- Enable RLS on `users`.
- This is a no-auth app (no sign-in screen) so policies use `TO anon, authenticated` to allow the anon-key frontend to read and write user rows. The data is intentionally shared/public for this portfolio/mock app.

3. Notes
- The onboarding flow inserts a new row here and stores the returned `id` in app state for subsequent screens.
- No foreign keys to auth.users since there is no authentication flow.
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  city text NOT NULL DEFAULT 'Bangalore',
  gender text NOT NULL CHECK (gender IN ('male','female','other')),
  interests text[] DEFAULT '{}',
  availability jsonb DEFAULT '{}',
  trust_score numeric DEFAULT 5.0,
  meetup_count int DEFAULT 0,
  rating numeric DEFAULT 0,
  comfort_settings text DEFAULT 'both' CHECK (comfort_settings IN ('pair','group','both')),
  avatar_id text,
  bio text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_users" ON users;
CREATE POLICY "anon_select_users" ON users FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_users" ON users;
CREATE POLICY "anon_insert_users" ON users FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_users" ON users;
CREATE POLICY "anon_update_users" ON users FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_users" ON users;
CREATE POLICY "anon_delete_users" ON users FOR DELETE
  TO anon, authenticated USING (true);