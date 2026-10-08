create table public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id),
  patient_id uuid not null references public.patients(id),
  reason text not null check (char_length(reason) between 1 and 200),
  priority text not null default 'normal' check (priority in ('normal', 'urgent')),
  status text not null default 'waiting'
    check (status in ('waiting', 'in_consultation', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  called_at timestamptz,
  completed_at timestamptz
);

create index queue_clinic_idx on public.queue_entries (clinic_id, status, created_at);

-- A patient can be in the active queue only once at a time
create unique index queue_one_active_per_patient
  on public.queue_entries (patient_id)
  where status in ('waiting', 'in_consultation');

-- The database sets the clinic from the patient, so the app cannot choose it
create function public.queue_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select clinic_id into new.clinic_id
  from public.patients where id = new.patient_id;
  return new;
end
$$;

create trigger queue_set_clinic
  before insert on public.queue_entries
  for each row execute function public.queue_before_insert();

-- The database stamps the times and blocks changes to finished entries
create function public.queue_before_update()
returns trigger
language plpgsql
as $$
begin
  if old.status in ('completed', 'cancelled') then
    raise exception 'A finished queue entry cannot be changed';
  end if;
  if new.status = 'in_consultation' and old.status = 'waiting' then
    new.called_at := now();
  elsif new.status = 'completed' then
    new.completed_at := now();
  end if;
  return new;
end
$$;

create trigger queue_stamp_times
  before update on public.queue_entries
  for each row execute function public.queue_before_update();

alter table public.queue_entries enable row level security;

-- Reception and nurses see their own clinic's queue
create policy queue_read_staff on public.queue_entries
  for select to authenticated
  using (public.my_role() in ('reception', 'nurse')
         and clinic_id = public.my_clinic_id());

-- ...add patients to it (the trigger fills in clinic_id before this check runs)
create policy queue_insert_staff on public.queue_entries
  for insert to authenticated
  with check (public.my_role() in ('reception', 'nurse')
              and clinic_id = public.my_clinic_id());

-- ...and move entries along: call in, complete, cancel
create policy queue_update_staff on public.queue_entries
  for update to authenticated
  using (public.my_role() in ('reception', 'nurse')
         and clinic_id = public.my_clinic_id())
  with check (public.my_role() in ('reception', 'nurse')
              and clinic_id = public.my_clinic_id());

grant select on public.queue_entries to authenticated;
grant insert (patient_id, reason, priority) on public.queue_entries to authenticated;
grant update (status) on public.queue_entries to authenticated;
grant all on public.queue_entries to service_role;

-- Lets the queue screen update live. Realtime still obeys the policies above.
alter publication supabase_realtime add table public.queue_entries;