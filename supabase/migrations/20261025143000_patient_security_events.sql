-- Security events are intentionally separate from clinical records and are
-- visible only to server-side functions. Never store a PIN or password here.
create table public.patient_security_events (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id),
  performed_by uuid not null references auth.users(id),
  event_type text not null check (event_type in ('pin_reset')),
  created_at timestamptz not null default now()
);

create index patient_security_events_patient_idx
  on public.patient_security_events (patient_id, created_at desc);

alter table public.patient_security_events enable row level security;
grant all on public.patient_security_events to service_role;
