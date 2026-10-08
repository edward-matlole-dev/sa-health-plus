-- Patient numbers look like SA-1000001
create sequence public.patient_number_seq start 1000001;

create function public.next_patient_number()
returns text
language sql
security definer
set search_path = ''
as $$
  select 'SA-' || lpad(nextval('public.patient_number_seq')::text, 7, '0')
$$;

-- Only our server-side functions may generate numbers
revoke execute on function public.next_patient_number() from public, anon, authenticated;
grant execute on function public.next_patient_number() to service_role;

-- The PATIENT entity
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  clinic_id uuid not null references public.clinics(id),
  patient_number text not null unique,
  first_name text not null,
  last_name text not null,
  id_number text not null unique check (id_number ~ '^[0-9]{13}$'),
  phone text not null check (phone ~ '^(\+27|0)[0-9]{9}$'),
  gender text not null check (gender in ('female', 'male')),
  date_of_birth date not null,
  sms_enabled boolean not null default true,
  push_enabled boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index patients_clinic_id_idx on public.patients (clinic_id);

alter table public.patients enable row level security;

-- Helper functions: who is asking? (security definer so they can read
-- profiles without triggering that table's own policies)
create function public.my_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles
  where id = (select auth.uid()) and is_active
$$;

create function public.my_clinic_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select clinic_id from public.profiles
  where id = (select auth.uid()) and is_active
$$;

revoke execute on function public.my_role() from public, anon;
revoke execute on function public.my_clinic_id() from public, anon;
grant execute on function public.my_role() to authenticated, service_role;
grant execute on function public.my_clinic_id() to authenticated, service_role;

-- A patient sees only their own record
create policy patients_read_own on public.patients
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Staff see the patients of their own clinic; super admin sees all
create policy patients_read_staff on public.patients
  for select to authenticated
  using (
    public.my_role() = 'super_admin'
    or (public.my_role() in ('reception', 'nurse', 'clinic_admin')
        and clinic_id = public.my_clinic_id())
  );

-- A patient may change only their own notification settings
create policy patients_update_own on public.patients
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select on public.patients to authenticated;
grant update (sms_enabled, push_enabled) on public.patients to authenticated;
grant all on public.patients to service_role;