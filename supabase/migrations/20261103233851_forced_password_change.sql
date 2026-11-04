-- A new or reset account must choose its own PIN or password before it can do anything else.
alter table public.profiles
  add column must_change_password boolean not null default false;

-- Until the person has changed it, every access rule treats the account as having no role.
create or replace function public.my_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles
  where id = (select auth.uid()) and is_active and not must_change_password
$$;

create or replace function public.my_clinic_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select clinic_id from public.profiles
  where id = (select auth.uid()) and is_active and not must_change_password
$$;

create or replace function public.my_patient_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.patients p
  join public.profiles pr on pr.id = p.user_id
  where p.user_id = (select auth.uid())
    and p.is_active and pr.is_active and not pr.must_change_password
$$;

-- The flag clears only when the password really changes.
create function public.clear_must_change_password()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set must_change_password = false
  where id = new.id and must_change_password;
  return new;
end
$$;

revoke execute on function public.clear_must_change_password() from public, anon, authenticated;

create trigger password_changed
  after update of encrypted_password on auth.users
  for each row
  when (old.encrypted_password is distinct from new.encrypted_password)
  execute function public.clear_must_change_password();