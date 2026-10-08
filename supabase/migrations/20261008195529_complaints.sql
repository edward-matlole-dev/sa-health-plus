create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id),
  patient_id uuid not null references public.patients(id),
  message_id uuid not null unique references public.messages(id),
  body text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolution_notes text,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  -- a resolved complaint always records the notes, who resolved it and when
  constraint complaints_resolution_complete check (
    status = 'open'
    or (char_length(coalesce(resolution_notes, '')) > 0
        and resolved_by is not null
        and resolved_at is not null)
  )
);

create index complaints_clinic_idx on public.complaints (clinic_id, status, created_at desc);

-- A patient's complaint message automatically opens a complaint
create function public.messages_open_complaint()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.category = 'complaint' and new.sender_role = 'patient' then
    insert into public.complaints (clinic_id, patient_id, message_id, body)
    values (new.clinic_id, new.patient_id, new.id, new.body);
  end if;
  return new;
end
$$;

create trigger messages_open_complaint
  after insert on public.messages
  for each row execute function public.messages_open_complaint();

-- The database records who resolved it and when, and locks it afterwards
create function public.complaints_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'resolved' then
    raise exception 'A resolved complaint cannot be changed';
  end if;
  if new.status = 'resolved' then
    new.resolved_by := auth.uid();
    new.resolved_at := now();
  end if;
  return new;
end
$$;

create trigger complaints_stamp_resolution
  before update on public.complaints
  for each row execute function public.complaints_before_update();

alter table public.complaints enable row level security;

-- Clinic admins see their own clinic's complaints; super admin sees all
create policy complaints_read_admin on public.complaints
  for select to authenticated
  using (
    public.my_role() = 'super_admin'
    or (public.my_role() = 'clinic_admin' and clinic_id = public.my_clinic_id())
  );

-- ...and resolve them
create policy complaints_update_admin on public.complaints
  for update to authenticated
  using (
    public.my_role() = 'super_admin'
    or (public.my_role() = 'clinic_admin' and clinic_id = public.my_clinic_id())
  )
  with check (
    public.my_role() = 'super_admin'
    or (public.my_role() = 'clinic_admin' and clinic_id = public.my_clinic_id())
  );

grant select on public.complaints to authenticated;
grant update (status, resolution_notes) on public.complaints to authenticated;
grant all on public.complaints to service_role;