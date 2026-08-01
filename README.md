# WithMe! — End-to-End Execution Runbook

How to use this: work top to bottom. Each phase names the tool, the exact steps, what to paste/prompt, and a 🛑 checkpoint before moving on. Come back to Claude only at a 🛑, on an error, or when a step says "ask Claude." Everything else is copy-paste-click.

---

## Pre-flight: Accounts & Keys (15 min)

Create these now, in this order, and keep the keys in one scratch note:

1. **GitHub** — account + one new empty repo, e.g. `withme-app`
2. **Supabase** (supabase.com) — new project, region closest to India (Singapore), note the **Project URL** and **anon public key**
3. **Groq** (console.groq.com) — sign up, generate an API key (no card needed)
4. **Bolt.new** — sign up with GitHub (so it can push directly to your repo)
5. **Lovable** — sign up with GitHub

🛑 **Checkpoint:** you should have 3 keys/URLs saved: Supabase URL, Supabase anon key, Groq key.

---

## Phase 0: Foundation — Supabase Schema (30–45 min)

This is the fixed contract both builder tools will build against. Doing this first means Bolt and Lovable never invent conflicting data models.

**Tool: Supabase → SQL Editor**

Paste and run this in one go:

```sql
-- USERS
create table users (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  city text not null default 'Bangalore',
  gender text not null check (gender in ('male','female','other')),
  interests text[] default '{}',
  availability jsonb default '{}',
  trust_score numeric default 5.0,
  meetup_count int default 0,
  rating numeric default 0,
  comfort_settings text default 'both' check (comfort_settings in ('pair','group','both')),
  avatar_id text,
  bio text,
  created_at timestamptz default now()
);

-- VENUES (B2B)
create table venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  location text,
  city text default 'Bangalore',
  contact_email text,
  verified boolean default false,
  partner_tier text default 'free' check (partner_tier in ('free','partner','premium')),
  withme_deal text,
  created_at timestamptz default now()
);

-- INTENTS
create table intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  activity_type text not null,
  venue_id uuid references venues(id),
  datetime timestamptz not null,
  companion_count int default 1,
  gender_rule text,
  status text default 'open' check (status in ('open','matched','closed')),
  created_at timestamptz default now()
);

-- MATCHES / GROUPS
create table matches (
  id uuid primary key default gen_random_uuid(),
  intent_ids uuid[] not null,
  member_ids uuid[] not null,
  group_size int not null,
  gender_mix text,
  status text default 'pending' check (status in ('pending','confirmed','completed','cancelled')),
  chat_enabled boolean default false,
  meetup_confirmed boolean default false,
  rating_submitted boolean default false,
  created_at timestamptz default now()
);

-- PLAN-SCOPED CHAT
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) on delete cascade,
  sender_id uuid references users(id),
  content text not null,
  created_at timestamptz default now()
);

-- EVENTS (B2B)
create table events (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade,
  title text not null,
  description text,
  datetime timestamptz not null,
  capacity int,
  group_size_preference text default 'open' check (group_size_preference in ('pairs','groups','open')),
  rsvp_count int default 0,
  status text default 'upcoming' check (status in ('upcoming','live','completed','cancelled')),
  created_at timestamptz default now()
);

-- ACTIVITY LOG (AI training/analytics signal)
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  activity_type text,
  venue_id uuid references venues(id),
  group_size int,
  rating numeric,
  returned_within_days int,
  created_at timestamptz default now()
);

-- AI CALL LOG (every consumer-ai / b2b-ai invocation, real or eval)
create table ai_calls_log (
  id uuid primary key default gen_random_uuid(),
  function_name text not null check (function_name in ('consumer-ai','b2b-ai')),
  prompt_version text default 'v1',
  input_prompt text not null,
  output_text text,
  model text,
  latency_ms int,
  is_eval boolean default false,
  eval_labels jsonb,
  created_at timestamptz default now()
);

-- EVAL GOLDEN SET (fixed test cases, grows over time, never blocks the build)
create table eval_cases (
  id uuid primary key default gen_random_uuid(),
  function_name text not null check (function_name in ('consumer-ai','b2b-ai')),
  case_type text not null check (case_type in ('deterministic','rubric')),
  input_prompt text not null,
  expected_or_rubric text not null,
  created_at timestamptz default now()
);
```

**Why these two tables now, not later:** both builder tools call the same two Edge Functions — nothing in Bolt or Lovable talks to the AI directly. So if the Edge Functions log every call here, you get a real, ever-growing eval dataset as a side effect of normal usage, with zero extra work in either UI tool, and zero rework if you redesign a screen later.

**RLS note:** this is mock/portfolio data, not real PII, so for speed you can leave Row Level Security off for now (Supabase defaults new tables to RLS-off unless you enable it). If you later want to look extra credible in a review, enable RLS with a simple public-read policy on `venues`, `events`, and `intents`, and skip write policies since there's no real auth flow yet. Ask Claude for exact policy SQL if you want this — don't hand-roll it under time pressure.

🛑 **Checkpoint:** Table Editor in Supabase shows all 9 tables with the right columns — `users`, `venues`, `intents`, `matches`, `chat_messages`, `events`, `activity_log`, `ai_calls_log`, `eval_cases`.

---

## Phase 1: Foundation — Edge Functions (20–30 min)

**Tool: Supabase → Edge Functions**

1. Go to **Project Settings → Edge Functions → Secrets**, add one secret:
   - `GROQ_API_KEY` = your Groq key

2. Create function `consumer-ai`, paste:

```ts
import { createClient } from "jsr:@supabase/supabase-js@2";

// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected by Supabase — no extra secret needed
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  const { prompt, is_eval = false } = await req.json();
  const start = Date.now();
  const groqKey = Deno.env.get("GROQ_API_KEY");
  const model = "llama-3.1-8b-instant"; // high daily cap (14,400 RPD) + fastest raw inference — fits high-frequency chat

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${groqKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] })
  });

  const data = await res.json();
  const outputText = data.choices?.[0]?.message?.content ?? "";

  await supabase.from("ai_calls_log").insert({
    function_name: "consumer-ai",
    input_prompt: prompt,
    output_text: outputText,
    model,
    latency_ms: Date.now() - start,
    is_eval
  });

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
});
```

Note the `is_eval` flag: real UI calls send `is_eval: false` (or omit it); your eval script (Phase 2 below) sends `is_eval: true`. Same function, same log table, cleanly separable later with one `WHERE` clause.

3. Create function `b2b-ai`, paste:

```ts
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  const { prompt, is_eval = false } = await req.json();
  const start = Date.now();
  const groqKey = Deno.env.get("GROQ_API_KEY");
  const model = "llama-3.3-70b-versatile"; // 1,000 RPD is ample for a once-a-day dashboard check; stronger reasoning for narration

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${groqKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] })
  });

  const data = await res.json();
  const outputText = data.choices?.[0]?.message?.content ?? "";

  await supabase.from("ai_calls_log").insert({
    function_name: "b2b-ai",
    input_prompt: prompt,
    output_text: outputText,
    model,
    latency_ms: Date.now() - start,
    is_eval
  });

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
});
```

4. Deploy both. Test each with the "Invoke" button using `{"prompt": "say hello", "is_eval": true}` — confirm you get a real model response back, and a new row appears in `ai_calls_log`.

⚠️ Both functions now share one Groq account, but `llama-3.1-8b-instant` and `llama-3.3-70b-versatile` have **separate per-model quotas** — heavy consumer traffic won't eat into the B2B function's daily allowance, or vice versa. Model names can still be renamed/deprecated by Groq over time; if a test call 404s, ask Claude.

🛑 **Checkpoint:** both functions return a valid AI response when invoked manually, and both write a row to `ai_calls_log`. This is the contract both apps will call — don't skip this test.

---


## Phase 1.5: Seed Mock Data (15–20 min)

**Tool: Supabase → Table Editor, or ask Claude**

Ask Claude in this chat: *"Generate mock insert SQL for 15 Bangalore venues, 30 users, 20 intents, 10 events, and 40 activity_log rows matching my schema."* Paste the result into the SQL Editor and run it. This gives both apps real-looking data to build against instead of empty screens.

🛑 **Checkpoint:** Table Editor shows populated rows in every table.

---

## Phase 2: Eval Hooks (15 min — do this now, not at the end)

**Tool: Supabase Table Editor + this chat**

1. Now that real venues/users/intents exist, ask Claude: *"Draft 8–10 insert rows for `eval_cases` per function, using my actual seeded venue and user data."*
   - **Deterministic cases** (`case_type='deterministic'`): pairs of real intents that should force a same-gender 1-on-1 match, and trios that should allow mixed groups. `expected_or_rubric` holds the plain-English expected outcome, e.g. `"gender_mix must equal 'same'"`.
   - **Rubric cases** (`case_type='rubric'`): realistic concierge prompts and B2B narration prompts, built from your real seeded venues. `expected_or_rubric` holds the scoring criteria, e.g. `"relevant to stated interests; natural tone; no fabricated numbers"`.
   Paste the SQL Claude gives you into the SQL Editor and run it.

2. That's the whole step — you're just populating a table, not building anything. Because every real call already logs to `ai_calls_log` with `is_eval=false`, and every golden-set call will log with `is_eval=true`, the actual grading step (Phase 7, after deploy) is just: pull rows from `ai_calls_log` where `is_eval=true`, paste them with their matching `eval_cases` row into a chat with Claude, and get them scored. Nothing about the app needs to change to make that possible later — it's already wired.

🛑 **Checkpoint:** `eval_cases` has rows for both functions. Move on to building — this doesn't block Phase 3 onward.

---

## Phase 3: Consumer App — Bolt.new (Day 1, main block)

**Tool: Bolt.new**

1. New project → connect your GitHub repo → connect Supabase (paste URL + anon key when prompted).
2. Build screen by screen, in this order, pasting each prompt below as-is into Bolt, checking the preview, then **pushing to GitHub after each one**.

**Screen 1 — Onboarding**
> Build an onboarding flow for a mobile-first web app called WithMe!. Steps: (1) pick an avatar from 15–20 options — use colored circles with initials as placeholders, labeled avatar_01 through avatar_20, (2) select interests as multi-select chips from: Films, Cafes, City walks, Trekking, Live music, Board games, Photography, Books, Yoga, Quiz nights, Standup comedy, Cycling, Food tours, Art, Startups, Gaming, (3) enter display name and city (default Bangalore), and select gender (male/female/other), (4) set availability as toggles for weekday mornings/evenings and weekend mornings/afternoons/evenings, (5) select comfort setting: pair, group, or both. On submit, insert a new row into the Supabase `users` table with display_name, city, gender, interests (Postgres text array), availability (jsonb), comfort_settings, avatar_id. Store the resulting user id in app state for the rest of the app to use.

**Screen 2 — Home / Discovery Feed**
> Build a home feed that queries the Supabase `intents` table joined with `users` (on user_id) and `venues` (on venue_id), filtered to status = 'open', ordered by datetime ascending. Render each as a card showing: the user's avatar_id as a colored circle, first name only from display_name, an 80-character one-liner from the user's bio field, the activity_type, venue name, and a friendly formatted datetime. No last name, no photo. Add a floating 'Post an Intent' button that navigates to the intent creation screen.

**Screen 3 — Post an Intent**
> Build a 'Post an Intent' screen with fields: activity type (text input), venue (searchable dropdown populated from the Supabase `venues` table), date/time picker, and companion count (number stepper, 1 to 6). On submit, insert into the Supabase `intents` table: user_id (current session user), activity_type, venue_id, datetime, companion_count, status defaulted to 'open', and gender_rule set automatically to 'same' if companion_count is 1, otherwise 'mixed'.

**Screen 4 — Match Screen**
> Build a match screen that, given an intent_id, queries other open intents with similar activity_type and overlapping datetime, and shows candidates as cards: 'Verified WithMe! member', their meetup_count, rating, and interests as chips, with a 'Confirm WithMe!' button. Enforce this rule in the query and UI: if companion_count is 1, only show candidates whose gender matches the current user's gender; if companion_count is 3 or more, show any gender mix. On Confirm, insert into the Supabase `matches` table: intent_ids, member_ids, group_size, gender_mix, status 'pending'.

**Screen 5 — Group Screen**
> Build a group/squad screen for a given match_id, showing member avatars and first names in a row, the venue and datetime, a countdown to the meetup, and a chat panel. The chat panel reads/writes the Supabase `chat_messages` table filtered by match_id, ordered by created_at, using Supabase Realtime so new messages appear live. Before rendering any message, redact 10-digit phone number patterns, @handles, and email-like patterns from the text, replacing them with '[redacted — stay on WithMe! until you've met]'.

**Screen 6 — AI Concierge**
> Build a chat-style AI Concierge screen. On sending a message, POST `{ prompt: <the user's message plus their stored interests and city for context> }` to `<your-supabase-project-url>/functions/v1/consumer-ai`, and render the returned text as the AI's reply in the chat thread. Show a loading indicator while waiting.

**Screen 7 — Trust Profile**
> Build a profile screen for the current user showing: avatar, first name, meetup_count, rating, comfort_settings, and past activities from the `activity_log` table filtered by user_id (activity_type, venue name, rating per entry). Do not show or ask for phone number, real name, or social handles anywhere on this screen.

⚠️ Pace check: Bolt's free daily allowance is finite. If you're going to run low, build screens 1–4 first (the core loop) and treat 5–7 as stretch — a working core loop demos better than seven half-finished screens.

🛑 **Checkpoint:** all 7 screens exist, read real data from Supabase, and the Concierge screen gets a real AI reply.

---

## Phase 4: B2B Dashboard — Lovable (Day 1 evening or parallel in a second tab)

**Tool: Lovable**

1. New project → connect the same GitHub repo (different folder/path, e.g. `/b2b`) → connect the same Supabase project.
2. Build in this order, pasting each prompt below as-is, pushing after each.

**Screen 1 — Venue Home**
> Build a venue home dashboard. Query the Supabase `events` table filtered by venue_id (the logged-in venue's id) and status = 'upcoming', ordered by datetime. Show each event as a card with title, datetime, capacity, and rsvp_count. Above the list, show an AI summary block — on page load, POST `{ prompt: "Summarize this venue's upcoming events: " + <event titles/dates/rsvp counts as text> }` to `<your-supabase-project-url>/functions/v1/b2b-ai`, and render the returned text.

**Screen 2 — Create Event**
> Build a 'Create Event' form: title, description, datetime picker, capacity (number), group size preference (select: pairs only / groups / open), and a toggle for 'WithMe!-exclusive deal' with a text field for the deal description. On submit, insert into the Supabase `events` table: venue_id (logged-in venue), title, description, datetime, capacity, group_size_preference, rsvp_count defaulted to 0, status defaulted to 'upcoming'.

**Screen 3 — Live Event View**
> Build a live event view for a given event_id, showing rsvp_count from the `events` table live (using Supabase Realtime), and a breakdown of confirmed attendees by group size pulled from the `matches` table where intent_ids reference intents tied to this event's venue and datetime window. Show simple counts: number of pairs vs. number of groups of 3+.

**Screen 4 — Analytics Dashboard**
> Build an analytics dashboard for the logged-in venue. Query the `activity_log` table filtered by venue_id and render: a Recharts bar chart of visit counts by group_size, a line chart of visits over the last 30 days by day, and a text panel for AI narration. For the narration, POST `{ prompt: "Summarize this venue's activity: " + <total visits, average rating, most common group size, peak day as text> }` to `<your-supabase-project-url>/functions/v1/b2b-ai`, and render the returned text below the charts.

**Screen 5 — Audience Insights**
> Build an audience insights screen: count of open `intents` in the same city matching this venue's category within the next 7 days, and the top 3 most common activity_types among those intents. Display as a simple list, e.g. "42 users in Bangalore are looking for a cafe meetup this weekend."

🛑 **Checkpoint:** dashboard shows real Supabase data, and the analytics panel returns real Groq-written narration, not placeholder text.

---

## Phase 5: Deploy Both to GitHub Pages (Day 2 morning)

**Tool: GitHub + terminal (Bolt/Lovable both export working repos; this part needs a few commands)**

1. In each app's folder, confirm `vite.config.js` has the correct `base: '/withme-app/consumer/'` (or `/b2b/`) path matching your repo name — this is the exact issue you hit before, so double-check it before building.
2. Run the build, then either:
   - Use a `gh-pages` npm script to push the `dist/` folder to a `gh-pages` branch, or
   - Set up a simple GitHub Actions workflow that builds and deploys on every push to `main`.
3. In repo Settings → Pages, point Pages at the `gh-pages` branch.
4. Repeat for the second app (or serve both from subpaths of one Pages site).

⚠️ If you hit the same base-path or blank-screen issue as last time, that's a 2-minute fix — bring the exact error to Claude rather than re-guessing configs.

🛑 **Checkpoint:** two live URLs, both loading real data from Supabase, both able to call their respective Edge Function.

---

## Phase 6: Final QA + Portfolio Packaging (Day 2 afternoon)

- [ ] Walk the full consumer loop once: onboard → post intent → get matched → see group → chat with Concierge
- [ ] Walk the full B2B loop once: create event → view live RSVPs → check analytics narration
- [ ] Confirm no API key appears anywhere in browser dev tools → Network tab (everything should route through the Edge Functions)
- [ ] Add both live links + the GitHub repo link to wherever you're sharing this (resume, portfolio site, application)
- [ ] Optional: record a 60–90 second walkthrough video as a backup if either free-tier AI call is rate-limited during an interview demo

---

## Phase 7: Run the Evals (30–45 min, after Phase 6)

By now `ai_calls_log` already has real usage rows from your QA walkthrough, and `eval_cases` has your golden set from Phase 2. Nothing left to build — just run it:

1. **Deterministic pass:** for each `eval_cases` row with `case_type='deterministic'`, call the relevant Edge Function with `is_eval: true`, then check the logged output against `expected_or_rubric`. Ask Claude for a short script that automates this loop and prints pass/fail — quick since the schema's already fixed.
2. **Rubric pass:** pull the `is_eval=true` rows with `case_type='rubric'` alongside their outputs, paste the batch into a chat with Claude, and ask for scores against each row's rubric text. Log the scores back into `eval_labels` on `ai_calls_log` if you want a queryable record.
3. Where scores cluster low on one dimension, that tells you which prompt in Bolt/Lovable to revise — not a schema change, not a rebuild.

---

## When to come back to Claude
- Any error message, exactly as shown
- A screen not matching the schema (Bolt/Lovable inventing fields that don't exist in Phase 0)
- Rate-limit walls on Groq/Bolt/Lovable and you want a re-sequenced plan
- Anything you want narrated differently for an interview ("why did you build it this way")

Everything else in this note is designed to be followed without a check-in.
