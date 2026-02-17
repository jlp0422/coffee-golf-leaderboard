-- Add co-member visibility to group_members
-- Run this in the Supabase SQL Editor
--
-- Problem: The current select policy on group_members only lets you see
-- your own membership rows. But group pages need to show all members.
--
-- Solution: Create a security-definer function that checks membership
-- without triggering RLS recursion, then use it in a policy.

-- 1. Create a helper function (security definer bypasses RLS)
create or replace function is_group_member(check_group_id uuid, check_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from group_members
    where group_id = check_group_id
      and user_id = check_user_id
  );
$$ language sql security definer;

-- 2. Add policy: if you're in the group, you can see all members of that group
create policy "Co-members can view each other"
  on group_members for select using (
    is_group_member(group_id, auth.uid())
  );
