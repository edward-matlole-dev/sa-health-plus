create table public.sms_log (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id),
  type text not null check (type in (
    'welcome', 'appointment_reminder', 'medication_reminder',
    'blood_test_reminder', 'flagged_vitals', 'pin_reset')),
  reference_id uuid,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'delivered', 'failed')),
  provider_message_id text,
  error text,
  created_at timestamptz not null default now()
);

create index sms_log_patient_idx on public.sms_log (patient_id, created_at desc);

-- RLS on, no policies, and no grants to the app: only our server-side
-- functions (which use the service role) can read or write this table.
alter table public.sms_log enable row level security;
grant all on public.sms_log to service_role;