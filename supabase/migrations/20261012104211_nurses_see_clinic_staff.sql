-- A nurse can see the names and roles of the staff at her own clinic,
-- so every visit can show who logged it. Patients' profiles stay private.
create policy profiles_read_clinic_staff on public.profiles
  for select to authenticated
  using (
    public.my_role() = 'nurse'
    and clinic_id = public.my_clinic_id()
    and role <> 'patient'
  );