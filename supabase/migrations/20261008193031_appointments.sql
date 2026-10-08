create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id),
  clinic_id uuid not null references public.clinics(id),
  visit_id uuid references public.visits(id),
  appointment_date date not null,
  type text not null,
  prep_notes text,
  priority text not null default 'normal' check (priority in ('normal', 'urgent')),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'attended', 'missed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index appointments_patient_idx on public.appointments (patient_id, appointment_date);
create index appointments_clinic_idx on public.appointments (clinic_id, appointment_date);

alter table public.appointments enable row level security;

-- A patient sees their own appointments
create policy appointments_read_own on public.appointments
  for select to authenticated
  using (patient_id = public.my_patient_id());

-- Nurses see appointments at their own clinic
create policy appointments_read_nurse on public.appointments
  for select to authenticated
  using (public.my_role() = 'nurse' and clinic_id = public.my_clinic_id());

-- Nurses book appointments for patients of their own clinic
create policy appointments_insert_nurse on public.appointments
  for insert to authenticated
  with check (
    public.my_role() = 'nurse'
    and clinic_id = public.my_clinic_id()
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.clinic_id = public.my_clinic_id()
    )
  );

-- Nurses update the status (attended, missed, cancelled) of their clinic's appointments
create policy appointments_update_nurse on public.appointments
  for update to authenticated
  using (public.my_role() = 'nurse' and clinic_id = public.my_clinic_id())
  with check (public.my_role() = 'nurse' and clinic_id = public.my_clinic_id());

grant select on public.appointments to authenticated;
grant insert (patient_id, clinic_id, visit_id, appointment_date, type,
              prep_notes, priority) on public.appointments to authenticated;
grant update (status) on public.appointments to authenticated;
grant all on public.appointments to service_role;