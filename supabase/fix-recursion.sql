-- Fix infinite recursion in group_members RLS policies
-- Run this in the Supabase SQL Editor

-- 1. Drop the self-referencing select policy on group_members
drop policy if exists "Group members can view membership" on group_members;

-- 2. Replace with a direct column check (no subquery = no recursion)
create policy "Users can view their own memberships"
  on group_members for select using (auth.uid() = user_id);

-- 3. Fix the delete policy too (also self-referenced group_members)
drop policy if exists "Owners can manage members" on group_members;

create policy "Group owners can manage members"
  on group_members for delete using (
    exists (
      select 1 from groups g
      where g.id = group_members.group_id
        and g.created_by = auth.uid()
    )
  );
