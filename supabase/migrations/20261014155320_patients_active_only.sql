-- A deactivated patient can no longer read or change their own details row
drop policy patients_read_own on public.patients;
create policy patients_read_own on public.patients
  for select to authenticated
  using (user_id = (select auth.uid()) and is_active);

drop policy patients_update_own on public.patients;
create policy patients_update_own on public.patients
  for update to authenticated
  using (user_id = (select auth.uid()) and is_active)
  with check (user_id = (select auth.uid()) and is_active);