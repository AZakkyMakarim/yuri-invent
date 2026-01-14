-- Trigger to automatically create a public user record when a new user signs up via Supabase Auth

-- 1. Create the function
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (
    "id",
    "supabaseId",
    "email",
    "name",
    "isActive",
    "createdAt",
    "updatedAt"
  )
  values (
    gen_random_uuid()::text, -- Generate a random UUID for the application ID
    new.id::text, -- The Supabase Auth User ID
    new.email,
    new.raw_user_meta_data ->> 'name',
    false, -- Default to inactive/pending verification
    now(),
    now()
  );
  return new;
end;
$$;

-- 2. Create the trigger
-- Drop if exists to avoid errors on multiple runs
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
