-- Additive private storage only. No customer tables or existing policies altered.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('myops-profile-logos','myops-profile-logos',false,262144,array['image/png','image/jpeg','image/webp']);
create policy myops_profile_logo_read on storage.objects for select to authenticated
using (bucket_id='myops-profile-logos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy myops_profile_logo_insert on storage.objects for insert to authenticated
with check (bucket_id='myops-profile-logos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy myops_profile_logo_delete on storage.objects for delete to authenticated
using (bucket_id='myops-profile-logos' and (storage.foldername(name))[1]=(select auth.uid())::text);
