/*
# Create activity_log table for Trust Profile

1. New Tables
- `activity_log`
  - `id` (uuid, primary key, auto-generated)
  - `user_id` (uuid, not null, FK to users ON DELETE CASCADE)
  - `activity_type` (text, not null) — the activity performed
  - `venue_id` (uuid, FK to venues ON DELETE SET NULL) — optional venue reference
  - `rating` (int, check 1–5) — user's rating for the activity
  - `created_at` (timestamptz, default now)

2. Security
- Enable RLS on `activity_log`.
- No-auth app: policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)` since data is intentionally shared/public.

3. Notes
- The Trust Profile screen queries activity_log joined with venues (on venue_id) filtered by user_id.
- Each entry shows activity_type, venue name, and rating.
- No phone numbers, real names, or social handles are stored here.
*/

CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  venue_id uuid REFERENCES venues(id) ON DELETE SET NULL,
  rating int CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_activity_log" ON activity_log;
CREATE POLICY "anon_select_activity_log" ON activity_log FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_activity_log" ON activity_log;
CREATE POLICY "anon_insert_activity_log" ON activity_log FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_activity_log" ON activity_log;
CREATE POLICY "anon_update_activity_log" ON activity_log FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_activity_log" ON activity_log;
CREATE POLICY "anon_delete_activity_log" ON activity_log FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log (user_id);
