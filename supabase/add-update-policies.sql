-- Add update/delete policies needed for group management and team assignments
-- Run this in the Supabase SQL Editor

-- Group owners can update their groups (rename)
create policy "Group owners can update their groups"
  on groups for update using (auth.uid() = created_by);

-- Group owners can delete their groups
create policy "Group owners can delete their groups"
  on groups for delete using (auth.uid() = created_by);

-- Allow admins/owners to update tournament participant team assignments
-- Uses security definer function to check group role without recursion
create or replace function is_group_admin_for_tournament(check_tournament_id uuid, check_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from tournaments t
    join group_members gm on gm.group_id = t.group_id
    where t.id = check_tournament_id
      and gm.user_id = check_user_id
      and gm.role in ('owner', 'admin')
  );
$$ language sql security definer;

create policy "Admins can update participant teams"
  on tournament_participants for update using (
    is_group_admin_for_tournament(tournament_id, auth.uid())
  );

-- Admins can remove participants
create policy "Admins can remove participants"
  on tournament_participants for delete using (
    is_group_admin_for_tournament(tournament_id, auth.uid())
    or auth.uid() = user_id
  );

-- Admins can add participants to tournaments
create policy "Admins can add participants"
  on tournament_participants for insert with check (
    auth.uid() = user_id
    or is_group_admin_for_tournament(tournament_id, auth.uid())
  );

-- Drop the old insert-only policy that's now superseded
drop policy if exists "Users can join tournaments in their groups" on tournament_participants;
