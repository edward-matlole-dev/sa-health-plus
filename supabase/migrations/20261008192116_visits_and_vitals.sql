-- Which patient record belongs to the signed-in user (null for staff)
create function public.my_patient_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.patients
  where user_id = (select auth.uid()) and is_active
$$;

revoke execute on function public.my_patient_id() from public, anon;
grant execute on function public.my_patient_id() to authenticated, service_role;

-- The VISIT entity: one clinic appointment, tied to the patient (not the nurse)
create table public.visits (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id),
  clinic_id uuid not null references public.clinics(id),
  logged_by uuid not null references public.profiles(id),
  visit_date timestamptz not null default now(),
  appointment_type text not null,
  general_condition text,
  urine text,
  notes text,
  created_at timestamptz not null default now()
);

create index visits_patient_idx on public.visits (patient_id, visit_date desc);
create index visits_clinic_idx on public.visits (clinic_id, visit_date desc);

alter table public.visits enable row level security;

-- A patient sees their own visits, whichever nurse logged them
create policy visits_read_own on public.visits
  for select to authenticated
  using (patient_id = public.my_patient_id());

-- Nurses see all visits at their own clinic
create policy visits_read_nurse on public.visits
  for select to authenticated
  using (public.my_role() = 'nurse' and clinic_id = public.my_clinic_id());

-- Nurses log visits for patients of their own clinic, under their own name
create policy visits_insert_nurse on public.visits
  for insert to authenticated
  with check (
    public.my_role() = 'nurse'
    and clinic_id = public.my_clinic_id()
    and logged_by = (select auth.uid())
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.clinic_id = public.my_clinic_id()
    )
  );

grant select on public.visits to authenticated;
grant insert (patient_id, clinic_id, logged_by, appointment_type,
              general_condition, urine, notes) on public.visits to authenticated;
grant all on public.visits to service_role;

-- The VITAL entity: one reading per row
create table public.vitals (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  type text not null check (type in (
    'bp_systolic', 'bp_diastolic', 'pulse', 'temperature', 'weight',
    'height', 'spo2', 'glucose', 'bmi', 'muac', 'haemoglobin', 'respiration')),
  value numeric not null,
  unit text not null,
  flagged boolean not null default false,
  severity text not null default 'normal'
    check (severity in ('normal', 'warning', 'critical')),
  recorded_at timestamptz not null default now(),
  unique (visit_id, type)
);

create index vitals_visit_idx on public.vitals (visit_id);

alter table public.vitals enable row level security;

-- You can read a reading only if you are allowed to see its visit
create policy vitals_read on public.vitals
  for select to authenticated
  using (exists (select 1 from public.visits v where v.id = visit_id));

-- Nurses add readings only to visits at their own clinic
create policy vitals_insert_nurse on public.vitals
  for insert to authenticated
  with check (
    public.my_role() = 'nurse'
    and exists (
      select 1 from public.visits v
      where v.id = visit_id and v.clinic_id = public.my_clinic_id()
    )
  );

grant select on public.vitals to authenticated;
-- The app cannot set flagged or severity; the database will decide those
grant insert (visit_id, type, value, unit) on public.vitals to authenticated;
grant all on public.vitals to service_role;