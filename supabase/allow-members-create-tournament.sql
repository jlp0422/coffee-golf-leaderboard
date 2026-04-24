drop policy "Group owners/admins can create tournaments" on tournaments;

create policy "Group members can create tournaments"
  on tournaments for insert with check (
    exists (
      select 1 from group_members gm
      where gm.group_id = tournaments.group_id
        and gm.user_id = auth.uid()
    )
  );
