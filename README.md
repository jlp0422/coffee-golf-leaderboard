# ☕ Coffee Golf Leaderboard

A leaderboard app for tracking [Coffee Golf](https://www.coffeegolf.app) scores with friends. Paste your daily result to log it, track your stats over time, and compete in groups and tournaments.

## Features

### Personal
- **Magic link auth** — sign in via email, no password needed
- **Auto-parse scores** — paste your Coffee Golf share text and it extracts everything automatically
- **Score history** — view all past rounds grouped by month, delete any entry
- **Statistics** — average score, best round, rounds played, current streak, per-color averages and bests, score distribution chart, last-10-rounds trend
- **Record Book** — top 10 rounds all time across all players, filterable by 7 days / 30 days / all time, with expandable scorecards
- **Profile** — set a display name and upload an avatar

### Groups & Tournaments
- **Create or join groups** via invite code
- **Group leaderboard** — ranked by average score across all rounds in the scoring window
- **Tournaments** — create and run competitions within a group in four formats:
  - **Stroke Play** — lowest total strokes wins
  - **Match Play** — hole-by-hole head-to-head; toggle between total strokes and classic match play scoring (1 UP, 2 DN, AS)
  - **Best Ball** — team format; best score per color hole counts (not by hole order)
  - **Skins** — win individual holes, ties carry over
- **Tournament status** — Live / Upcoming / Final derived automatically from start and end dates
- **Team pairings** — group owners/admins assign players to teams before a tournament starts
- **Participant management** — add/remove members from a tournament, reassign teams

## Score Format

Coffee Golf shares scores in this format:

```
Coffee Golf - Feb 15 14 Strokes - Top 50% 🟦🟨🟥🟪🟩 2️⃣5️⃣2️⃣2️⃣3️⃣
```

The parser extracts:
- **Date** from `Mon DD` (e.g. `Feb 15`)
- **Total strokes** (e.g. `14`)
- **Per-hole strokes** paired with their color (blue, yellow, red, purple, green)
- The `Top X%` ranking is ignored — only raw scores are stored

Colors are the stable key for cross-day comparisons (the hole order varies daily).

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Auth | Supabase Auth (magic link) |
| Database | Supabase (PostgreSQL + Row Level Security) |
| Storage | Supabase Storage (avatar images) |
| Hosting | Vercel |
| Testing | Jest + ts-jest |

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Dashboard
│   ├── submit/page.tsx             # Paste & submit score
│   ├── history/page.tsx            # Round history
│   ├── stats/page.tsx              # Stats & charts
│   ├── records/page.tsx            # Record Book (top rounds across all players)
│   ├── profile/page.tsx            # Edit display name, upload avatar
│   ├── groups/
│   │   ├── page.tsx                # My groups list
│   │   ├── create/page.tsx         # Create group
│   │   ├── join/page.tsx           # Join via invite code
│   │   ├── actions.ts              # Server actions: groups, tournaments
│   │   ├── [id]/page.tsx           # Group detail (leaderboard, members, tournaments, settings)
│   │   └── [id]/tournament/
│   │       ├── new/page.tsx        # Create tournament
│   │       ├── [tournamentId]/page.tsx        # Tournament standings & pairings
│   │       └── [tournamentId]/scorecard/page.tsx  # Individual scorecard view
│   └── actions.ts                  # Server actions: scores, stats, record book
├── components/
│   ├── Nav.tsx                     # Responsive nav (bottom on mobile, top on desktop)
│   ├── ScoreCard.tsx               # Reusable scorecard component
│   ├── ScorePreview.tsx            # Live parse preview before submission
│   ├── ShareStatsButton.tsx        # iOS share sheet integration
│   ├── LoadingSpinner.tsx          # Loading state indicator
│   ├── Greeting.tsx                # Time-of-day greeting on dashboard
│   └── TodaySection.tsx            # Today's round status on dashboard
└── lib/
    ├── parse-score.ts              # Core score parser
    ├── parse-score.test.ts         # Jest tests for the parser
    ├── types.ts                    # Shared TypeScript types
    ├── date-utils.ts               # Timezone-safe date helpers
    ├── tournament-utils.ts         # Tournament status + badge helpers
    └── supabase/                   # Supabase client helpers
supabase/
├── schema.sql                      # Full DB schema with RLS policies + get_rounds_for_records()
├── fix-recursion.sql               # Migration: fix group_members RLS recursion
├── add-co-member-visibility.sql    # Migration: co-member visibility via security definer
├── add-update-policies.sql         # Migration: group/tournament update & delete policies
└── add-avatar-storage-policies.sql # Migration: avatar storage bucket policies
```

## Getting Started

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project.

### 2. Run the database schema

In the Supabase SQL editor, run `supabase/schema.sql` in full. Then run the migration files in order:

```
supabase/fix-recursion.sql
supabase/add-co-member-visibility.sql
supabase/add-update-policies.sql
supabase/add-avatar-storage-policies.sql
```

### 3. Create the avatars storage bucket

In the Supabase dashboard → **Storage**, create a new bucket named `avatars` with **public access** enabled.

### 4. Set environment variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

- **Publishable key** — safe to expose in client-side code; used with Row Level Security
- **Secret key** — server-only, bypasses RLS; only needed for admin operations (not used in this app)

### 5. Configure Supabase Auth

In the Supabase dashboard → **Authentication → URL Configuration**:
- Set **Site URL** to your app URL (e.g. `http://localhost:3000` for local dev)
- Add `http://localhost:3000/auth/callback` to **Redirect URLs**

### 6. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploying to Vercel

1. Push your repo to GitHub
2. Import it at [vercel.com/new](https://vercel.com/new)
3. Add the same environment variables from `.env.local` in the Vercel project settings
4. Update Supabase Auth redirect URLs to include your Vercel domain (e.g. `https://your-app.vercel.app/auth/callback`)

## Running Tests

```bash
npm test
```

The parser tests cover: standard parse, variable color ordering, ignoring `Top X%`, total mismatch detection, missing date, wrong color count, and no percentage line.

## UI Theme

Golf scorecard meets coffee shop:
- Parchment background (`#f5f0e8`) with Masters green accents
- [Caveat](https://fonts.google.com/specimen/Caveat) for handwritten scores
- Georgia serif for headers
- Coffee stain SVG decorations

## Architecture Notes

- **Colors as stable keys** — Coffee Golf uses the same 5 colors every day but changes hole order. Colors (not positions) are used for all per-hole comparisons and stats.
- **One score per day** — enforced by a unique constraint at the DB level (`user_id + played_date`).
- **RLS recursion fix** — `group_members` had a self-referencing SELECT policy that caused infinite recursion. Fixed via a `security definer` function (`is_group_member()`) that bypasses RLS when checking co-membership.
- **Cross-user leaderboard** — the `rounds` table restricts SELECT to the owner's rows. The Record Book uses a `security definer` RPC function (`get_rounds_for_records()`) to safely return all rounds with only leaderboard-safe fields (no private data).
- **Tournament status** — derived client-side from `start_date` / `end_date` rather than stored in the DB, so it's always accurate without any update jobs.
- **No realtime** — all data is fetched on page load / user action. No Supabase Realtime subscriptions.
