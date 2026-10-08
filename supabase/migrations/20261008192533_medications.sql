-- The MEDICATION entity
create table public.medications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id),
  visit_id uuid references public.visits(id),
  name text not null,
  dosage text,
  frequency text,
  start_date date not null default current_date,
  end_date date,
  supply_days int check (supply_days > 0),
  next_collection date,
  status text not null default 'active' check (status in ('active', 'stopped')),
  created_at timestamptz not null default now(),
  constraint medications_dates_valid check (end_date is null or end_date >= start_date)
);

create index medications_patient_idx on public.medications (patient_id, status);

alter table public.medications enable row level security;

-- A patient sees their own medications
create policy medications_read_own on public.medications
  for select to authenticated
  using (patient_id = public.my_patient_id());

-- Nurses see medications of patients at their own clinic
create policy medications_read_nurse on public.medications
  for select to authenticated
  using (
    public.my_role() = 'nurse'
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.clinic_id = public.my_clinic_id()
    )
  );

-- Nurses prescribe for patients of their own clinic
create policy medications_insert_nurse on public.medications
  for insert to authenticated
  with check (
    public.my_role() = 'nurse'
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.clinic_id = public.my_clinic_id()
    )
  );

-- Nurses may stop a medication or update its collection date, nothing else
create policy medications_update_nurse on public.medications
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

grant select on public.medications to authenticated;
grant insert (patient_id, visit_id, name, dosage, frequency, start_date,
              end_date, supply_days, next_collection) on public.medications to authenticated;
grant update (status, end_date, next_collection) on public.medications to authenticated;
grant all on public.medications to service_role;