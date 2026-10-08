-- One row per sign-in account (the USER entity in the ER diagram)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null,
  clinic_id uuid references public.clinics(id),
  language text not null default 'en'
    check (language in ('en', 'zu', 'st', 'xh', 'af')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  -- everyone except a super admin must belong to a clinic
  constraint profiles_clinic_required
    check (role = 'super_admin' or clinic_id is not null)
);

create index profiles_clinic_id_idx on public.profiles (clinic_id);

alter table public.profiles enable row level security;

-- A signed-in user can read and update only their own profile
create policy profiles_read_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Users may change only their language. Role and clinic can be changed
-- only by our server-side functions, never from the app.
grant select on public.profiles to authenticated;
grant update (language) on public.profiles to authenticated;
grant all on public.profiles to service_role;