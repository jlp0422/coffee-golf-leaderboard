-- Storage RLS policies for the "avatars" bucket
-- Run this in the Supabase SQL editor after creating the bucket

-- Allow anyone to read avatar images (bucket is public)
create policy "Public avatar read access"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Allow authenticated users to upload their own avatar
-- File name must start with the user's ID (e.g. "abc123.png")
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] is null
    and starts_with(name, auth.uid()::text)
  );

-- Allow authenticated users to update (overwrite) their own avatar
create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and starts_with(name, auth.uid()::text)
  );

-- Allow authenticated users to delete their own avatar
create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and starts_with(name, auth.uid()::text)
  );
