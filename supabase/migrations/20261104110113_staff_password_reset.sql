-- Staff password resets are recorded here. Only server functions can read or write it.
-- Never store a password in this table.
create table public.staff_security_events (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles(id) on delete cascade,
  performed_by uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('password_reset')),
  created_at timestamptz not null default now()
);

create index staff_security_events_staff_idx
  on public.staff_security_events (staff_id, created_at desc);

alter table public.staff_security_events enable row level security;
grant all on public.staff_security_events to service_role;

-- Ends every session of an account, so a lost or stolen phone cannot keep working after a reset.
create function public.revoke_user_sessions(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.sessions where user_id = p_user
$$;

revoke execute on function public.revoke_user_sessions(uuid) from public, anon, authenticated;
grant execute on function public.revoke_user_sessions(uuid) to service_role;