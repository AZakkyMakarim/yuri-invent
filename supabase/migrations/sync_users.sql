-- Script to Sync Missing Users from Auth to Public
-- Run this if you signed up a user BEFORE creating the trigger

insert into public.users (
    "id",
    "supabaseId",
    "email",
    "name",
    "isActive",
    "createdAt",
    "updatedAt"
)
select
    gen_random_uuid()::text,
    au.id,
    au.email,
    au.raw_user_meta_data ->> 'name',
    false, -- Default to inactive
    now(),
    now()
from auth.users au
where not exists (
    select 1 from public.users pu where pu."supabaseId" = au.id::text
);
