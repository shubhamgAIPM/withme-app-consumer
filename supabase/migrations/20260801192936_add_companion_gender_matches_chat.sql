/*
# Add companion_count/gender_rule to intents; create matches + chat_messages tables

1. Modified Tables
- `intents`
  - `companion_count` (int, not null, default 1, check 1–6) — how many companions the user is looking for
  - `gender_rule` (text, not null, default 'same', check same/mixed) — auto-set: 'same' when companion_count=1, 'mixed' otherwise

2. New Tables
- `matches`
  - `id` (uuid, primary key, auto-generated)
  - `intent_ids` (uuid[], not null) — the intents that formed this match
  - `member_ids` (uuid[], not null) — the users participating
  - `group_size` (int, not null) — total number of members
  - `gender_mix` (text, not null) — 'same' or 'mixed'
  - `status` (text, not null, default 'pending', check pending/confirmed/cancelled) — match lifecycle
  - `venue_id` (uuid, FK to venues, nullable) — the agreed venue
  - `datetime` (timestamptz, nullable) — the agreed meetup time
  - `created_at` (timestamptz, default now)

- `chat_messages`
  - `id` (uuid, primary key, auto-generated)
  - `match_id` (uuid, not null, FK to matches ON DELETE CASCADE)
  - `sender_id` (uuid, not null, FK to users ON DELETE CASCADE)
  - `message` (text, not null) — message text (redacted client-side before display)
  - `created_at` (timestamptz, default now)

3. Security
- Enable RLS on `matches` and `chat_messages`.
- No-auth app: policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)` since data is intentionally shared/public.

4. Notes
- `intent_ids` and `member_ids` are Postgres uuid arrays so a match can reference multiple intents and users.
- `chat_messages` cascades on match deletion so messages are cleaned up automatically.
- An index on `chat_messages(match_id, created_at)` supports the ordered message-list query.
*/

-- Add columns to intents
ALTER TABLE intents ADD COLUMN IF NOT EXISTS companion_count int NOT NULL DEFAULT 1 CHECK (companion_count BETWEEN 1 AND 6);
ALTER TABLE intents ADD COLUMN IF NOT EXISTS gender_rule text NOT NULL DEFAULT 'same' CHECK (gender_rule IN ('same','mixed'));

-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_ids uuid[] NOT NULL,
  member_ids uuid[] NOT NULL,
  group_size int NOT NULL,
  gender_mix text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled')),
  venue_id uuid REFERENCES venues(id) ON DELETE SET NULL,
  datetime timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_matches" ON matches;
CREATE POLICY "anon_select_matches" ON matches FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_matches" ON matches;
CREATE POLICY "anon_insert_matches" ON matches FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_matches" ON matches;
CREATE POLICY "anon_update_matches" ON matches FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_matches" ON matches;
CREATE POLICY "anon_delete_matches" ON matches FOR DELETE
  TO anon, authenticated USING (true);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_chat_messages" ON chat_messages;
CREATE POLICY "anon_select_chat_messages" ON chat_messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chat_messages" ON chat_messages;
CREATE POLICY "anon_insert_chat_messages" ON chat_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_chat_messages" ON chat_messages;
CREATE POLICY "anon_update_chat_messages" ON chat_messages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_chat_messages" ON chat_messages;
CREATE POLICY "anon_delete_chat_messages" ON chat_messages FOR DELETE
  TO anon, authenticated USING (true);

-- Index for the ordered message-list query
CREATE INDEX IF NOT EXISTS idx_chat_messages_match_created ON chat_messages (match_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches (status);
