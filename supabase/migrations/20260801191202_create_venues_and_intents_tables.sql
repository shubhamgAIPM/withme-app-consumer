/*
# Create venues and intents tables for WithMe! app

1. New Tables

- `venues`
  - `id` (uuid, primary key, auto-generated)
  - `name` (text, not null) — venue display name
  - `city` (text, not null, default 'Bangalore') — city the venue is in
  - `area` (text) — neighbourhood / area within the city
  - `category` (text) — venue category (cafe, restaurant, park, etc.)
  - `created_at` (timestamptz, default now)

- `intents`
  - `id` (uuid, primary key, auto-generated)
  - `user_id` (uuid, foreign key to users.id ON DELETE CASCADE, not null) — who posted the intent
  - `venue_id` (uuid, foreign key to venues.id ON DELETE SET NULL) — optional venue reference
  - `activity_type` (text, not null) — the activity (Films, Cafes, Trekking, etc.)
  - `bio` (text) — short description / one-liner for the feed
  - `datetime` (timestamptz, not null) — when the user wants to meet
  - `status` (text, not null, default 'open', check open/closed/expired) — intent lifecycle
  - `created_at` (timestamptz, default now)

2. Security
- Enable RLS on both `venues` and `intents`.
- This is a no-auth app (no sign-in screen) so policies use `TO anon, authenticated` to allow the anon-key frontend to read and write. The data is intentionally shared/public for this portfolio/mock app.

3. Notes
- The home feed queries intents joined with users (on user_id) and venues (on venue_id), filtered to status = 'open', ordered by datetime ascending.
- intents.user_id is NOT NULL and cascades on user delete.
- intents.venue_id is nullable (a user may post an intent without a specific venue).
*/

CREATE TABLE IF NOT EXISTS venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL DEFAULT 'Bangalore',
  area text,
  category text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_venues" ON venues;
CREATE POLICY "anon_select_venues" ON venues FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_venues" ON venues;
CREATE POLICY "anon_insert_venues" ON venues FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_venues" ON venues;
CREATE POLICY "anon_update_venues" ON venues FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_venues" ON venues;
CREATE POLICY "anon_delete_venues" ON venues FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  venue_id uuid REFERENCES venues(id) ON DELETE SET NULL,
  activity_type text NOT NULL,
  bio text,
  datetime timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','expired')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_intents" ON intents;
CREATE POLICY "anon_select_intents" ON intents FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_intents" ON intents;
CREATE POLICY "anon_insert_intents" ON intents FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_intents" ON intents;
CREATE POLICY "anon_update_intents" ON intents FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_intents" ON intents;
CREATE POLICY "anon_delete_intents" ON intents FOR DELETE
  TO anon, authenticated USING (true);

-- Index for the common feed query: status = 'open' ordered by datetime
CREATE INDEX IF NOT EXISTS idx_intents_status_datetime ON intents (status, datetime ASC);
CREATE INDEX IF NOT EXISTS idx_intents_user_id ON intents (user_id);
CREATE INDEX IF NOT EXISTS idx_intents_venue_id ON intents (venue_id);