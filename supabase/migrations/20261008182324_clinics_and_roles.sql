-- Who can sign in, and in what capacity
create type public.user_role as enum
  ('patient', 'reception', 'nurse', 'clinic_admin', 'super_admin');

-- A clinic using the system (supports many clinics on one backend)
create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  province text not null check (province in (
    'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo',
    'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape')),
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Row Level Security on, with no policies yet: nobody can read it until we say so
alter table public.clinics enable row level security;

-- Because "automatically expose new tables" was turned off, grant access explicitly.
-- RLS policies (added later) still decide which rows each user can reach.
grant select, insert, update on public.clinics to authenticated;
grant all on public.clinics to service_role;