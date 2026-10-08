create table public.injections (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id),
  visit_id uuid references public.visits(id),
  name text not null,
  date_given date not null default current_date,
  next_due date,
  nurse_tip text,
  created_at timestamptz not null default now(),
  -- the next dose cannot be due before the one just given
  constraint injections_dates_valid check (next_due is null or next_due >= date_given)
);

create index injections_patient_idx on public.injections (patient_id, date_given desc);

alter table public.injections enable row level security;

-- A patient sees their own injections
create policy injections_read_own on public.injections
  for select to authenticated
  using (patient_id = public.my_patient_id());

-- Nurses see injections of patients at their own clinic
create policy injections_read_nurse on public.injections
  for select to authenticated
  using (
    public.my_role() = 'nurse'
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.clinic_id = public.my_clinic_id()
    )
  );

-- Nurses record injections for patients of their own clinic
create policy injections_insert_nurse on public.injections
  for insert to authenticated
  with check (
    public.my_role() = 'nurse'
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.clinic_id = public.my_clinic_id()
    )
  );

grant select on public.injections to authenticated;
grant insert (patient_id, visit_id, name, date_given, next_due, nurse_tip)
  on public.injections to authenticated;
grant all on public.injections to service_role;