-- The BLOOD_TEST entity
create table public.blood_tests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id),
  visit_id uuid references public.visits(id),
  test_name text not null,
  category text,
  due_date date,
  result text,
  unit text,
  flagged boolean not null default false,
  tested_at timestamptz,
  created_at timestamptz not null default now(),
  -- a result and the date it was recorded always come together
  constraint blood_tests_result_complete check (
    (result is null and tested_at is null)
    or (result is not null and tested_at is not null)
  )
);

create index blood_tests_patient_idx on public.blood_tests (patient_id, due_date);

alter table public.blood_tests enable row level security;

-- A patient sees their own blood tests
create policy blood_tests_read_own on public.blood_tests
  for select to authenticated
  using (patient_id = public.my_patient_id());

-- Nurses see blood tests of patients at their own clinic
create policy blood_tests_read_nurse on public.blood_tests
  for select to authenticated
  using (
    public.my_role() = 'nurse'
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.clinic_id = public.my_clinic_id()
    )
  );

-- Nurses order tests for patients of their own clinic
create policy blood_tests_insert_nurse on public.blood_tests
  for insert to authenticated
  with check (
    public.my_role() = 'nurse'
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.clinic_id = public.my_clinic_id()
    )
  );

-- Nurses record the result when it comes back
create policy blood_tests_update_nurse on public.blood_tests
  for update to authenticated
  using (
    public.my_role() = 'nurse'
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.clinic_id = public.my_clinic_id()
    )
  )
  with check (
    public.my_role() = 'nurse'
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.clinic_id = public.my_clinic_id()
    )
  );

grant select on public.blood_tests to authenticated;
grant insert (patient_id, visit_id, test_name, category, due_date)
  on public.blood_tests to authenticated;
grant update (result, unit, tested_at) on public.blood_tests to authenticated;
grant all on public.blood_tests to service_role;