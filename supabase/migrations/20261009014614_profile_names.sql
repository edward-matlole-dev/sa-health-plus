-- Staff need names (this is where the STAFF entity from the Planning ERD ended up)
alter table public.profiles
  add column first_name text,
  add column last_name text;

-- Your existing super admin profile gets a placeholder name
update public.profiles
   set first_name = 'Super', last_name = 'Admin'
 where role = 'super_admin' and first_name is null;

-- Every staff account must have a name (patients keep theirs in the patients table)
alter table public.profiles
  add constraint profiles_staff_named
  check (role = 'patient' or (first_name is not null and last_name is not null));

-- Clinic admins read the staff of their own clinic; super admin reads all
create policy profiles_read_admin on public.profiles
  for select to authenticated
  using (
    public.my_role() = 'super_admin'
    or (public.my_role() = 'clinic_admin' and clinic_id = public.my_clinic_id())
  );