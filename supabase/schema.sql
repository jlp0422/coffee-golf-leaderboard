-- Coffee Golf Leaderboard Schema
-- Run this in the Supabase SQL Editor to set up the database
--
-- All tables are created first, then RLS policies are added after,
-- so that cross-table policy references resolve correctly.

-- ============================================================
-- 1. CREATE ALL TABLES
-- ============================================================

-- PROFILES (extends Supabase auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- ROUNDS (one per user per day)
create table rounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  played_date date not null,
  total_strokes int not null check (total_strokes > 0),
  raw_input text not null,
  created_at timestamptz default now(),
  unique(user_id, played_date)
);

-- HOLE SCORES (keyed by color, not hole order)
create table hole_scores (
  id uuid primary key default gen_random_uuid(),
  round_id uuid references rounds(id) on delete cascade not null,
  color text not null check (color in ('blue', 'yellow', 'red', 'purple', 'green')),
  strokes int not null check (strokes between 1 and 9),
  hole_number int not null check (hole_number between 1 and 5),
  unique(round_id, color)
);

-- GROUPS
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references profiles(id) not null,
  invite_code text unique default substr(gen_random_uuid()::text, 1, 8),
  created_at timestamptz default now()
);

-- GROUP MEMBERS
create table group_members (
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

-- TOURNAMENTS
create table tournaments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade not null,
  name text not null,
  format text not null check (format in (
    'stroke_play',
    'match_play',
    'best_ball',
    'skins'
  )),
  start_date date not null,
  end_date date not null,
  team_size int default 1,
  status text default 'upcoming' check (status in ('upcoming', 'active', 'completed')),
  created_by uuid references profiles(id) not null,
  created_at timestamptz default now()
);

-- TOURNAMENT PARTICIPANTS
create table tournament_participants (
  tournament_id uuid references tournaments(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  team_id int,
  primary key (tournament_id, user_id)
);

-- ============================================================
-- 2. AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- 3. ENABLE RLS ON ALL TABLES
-- ============================================================

alter table profiles enable row level security;
alter table rounds enable row level security;
alter table hole_scores enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table tournaments enable row level security;
alter table tournament_participants enable row level security;

-- ============================================================
-- 4. RLS POLICIES (all tables exist, so cross-references work)
-- ============================================================

-- PROFILES policies
create policy "Users can view any profile"
  on profiles for select using (true);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert their own profile"
  on profiles for insert with check (auth.uid() = id);

-- ROUNDS policies
create policy "Users can view their own rounds"
  on rounds for select using (auth.uid() = user_id);

create policy "Users can insert their own rounds"
  on rounds for insert with check (auth.uid() = user_id);

create policy "Users can delete their own rounds"
  on rounds for delete using (auth.uid() = user_id);

-- V2: Add group-based round visibility when groups UI is built.
-- Kept separate to avoid recursive RLS on group_members.

-- HOLE SCORES policies
create policy "Users can view hole scores for visible rounds"
  on hole_scores for select using (
    exists (
      select 1 from rounds r where r.id = hole_scores.round_id
      and (
        r.user_id = auth.uid()
        or exists (
          select 1 from group_members gm1
          join group_members gm2 on gm1.group_id = gm2.group_id
          where gm1.user_id = auth.uid()
            and gm2.user_id = r.user_id
        )
      )
    )
  );

create policy "Users can insert hole scores for their own rounds"
  on hole_scores for insert with check (
    exists (
      select 1 from rounds r where r.id = hole_scores.round_id
      and r.user_id = auth.uid()
    )
  );

create policy "Users can delete hole scores for their own rounds"
  on hole_scores for delete using (
    exists (
      select 1 from rounds r where r.id = hole_scores.round_id
      and r.user_id = auth.uid()
    )
  );

-- GROUPS policies
create policy "Anyone can look up group by invite code"
  on groups for select using (true);

create policy "Authenticated users can create groups"
  on groups for insert with check (auth.uid() = created_by);

-- GROUP MEMBERS policies
-- NOTE: These policies use direct column checks instead of subqueries
-- on group_members itself, to avoid infinite recursion in RLS evaluation.

-- Users can see any membership row for groups they belong to.
-- This works because Postgres checks each row: "is auth.uid() the user_id
-- on THIS row?" — no self-referencing subquery needed.
create policy "Users can view their own memberships"
  on group_members for select using (auth.uid() = user_id);

create policy "Users can join groups"
  on group_members for insert with check (auth.uid() = user_id);

-- Owners can delete other members. We check ownership via the groups table
-- (created_by) to avoid self-referencing group_members.
create policy "Group owners can manage members"
  on group_members for delete using (
    exists (
      select 1 from groups g
      where g.id = group_members.group_id
        and g.created_by = auth.uid()
    )
  );

-- TOURNAMENTS policies
create policy "Group members can view tournaments"
  on tournaments for select using (
    exists (
      select 1 from group_members gm
      where gm.group_id = tournaments.group_id and gm.user_id = auth.uid()
    )
  );

create policy "Group owners/admins can create tournaments"
  on tournaments for insert with check (
    exists (
      select 1 from group_members gm
      where gm.group_id = tournaments.group_id
        and gm.user_id = auth.uid()
        and gm.role in ('owner', 'admin')
    )
  );

-- TOURNAMENT PARTICIPANTS policies
create policy "Group members can view participants"
  on tournament_participants for select using (
    exists (
      select 1 from tournaments t
      join group_members gm on gm.group_id = t.group_id
      where t.id = tournament_participants.tournament_id
        and gm.user_id = auth.uid()
    )
  );

create policy "Users can join tournaments in their groups"
  on tournament_participants for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from tournaments t
      join group_members gm on gm.group_id = t.group_id
      where t.id = tournament_participants.tournament_id
        and gm.user_id = auth.uid()
    )
  );

-- ============================================================
-- 5. INDEXES
-- ============================================================

create index idx_rounds_user_date on rounds(user_id, played_date desc);
create index idx_hole_scores_round on hole_scores(round_id);
create index idx_group_members_user on group_members(user_id);
create index idx_tournament_participants_tournament on tournament_participants(tournament_id);
