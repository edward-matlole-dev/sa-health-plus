create table public.messages (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id),
  patient_id uuid not null references public.patients(id),
  sender_id uuid not null references auth.users(id),
  sender_role text not null check (sender_role in ('patient', 'staff')),
  category text not null default 'general'
    check (category in ('general', 'complaint', 'medication', 'results', 'emergency')),
  is_urgent boolean not null default false,
  body text not null check (char_length(body) between 1 and 2000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index messages_patient_idx on public.messages (patient_id, created_at);
create index messages_clinic_idx on public.messages (clinic_id, created_at desc);

-- The database fills in the clinic, the sender and the sender's role.
-- The app cannot choose these, so a message cannot be sent "as" someone else.
create function public.messages_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select clinic_id into new.clinic_id
  from public.patients where id = new.patient_id;

  new.sender_id := auth.uid();
  new.sender_role := case when public.my_role() = 'patient' then 'patient' else 'staff' end;
  return new;
end
$$;

create trigger messages_set_sender
  before insert on public.messages
  for each row execute function public.messages_before_insert();

alter table public.messages enable row level security;

-- A patient reads their own conversation
create policy messages_read_own on public.messages
  for select to authenticated
  using (patient_id = public.my_patient_id());

-- Nurses read the conversations of their own clinic
create policy messages_read_nurse on public.messages
  for select to authenticated
  using (public.my_role() = 'nurse' and clinic_id = public.my_clinic_id());

-- A patient sends messages to their own clinic
create policy messages_insert_patient on public.messages
  for insert to authenticated
  with check (
    public.my_role() = 'patient'
    and patient_id = public.my_patient_id()
  );

-- A nurse replies to patients of their own clinic
create policy messages_insert_nurse on public.messages
  for insert to authenticated
  with check (
    public.my_role() = 'nurse'
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.clinic_id = public.my_clinic_id()
    )
  );

-- Read receipts: a patient marks clinic replies as read...
create policy messages_update_patient on public.messages
  for update to authenticated
  using (patient_id = public.my_patient_id() and sender_role = 'staff')
  with check (patient_id = public.my_patient_id() and sender_role = 'staff');

-- ...and a nurse marks patient messages as read
create policy messages_update_nurse on public.messages
  for update to authenticated
  using (public.my_role() = 'nurse' and clinic_id = public.my_clinic_id()
         and sender_role = 'patient')
  with check (public.my_role() = 'nurse' and clinic_id = public.my_clinic_id()
              and sender_role = 'patient');

grant select on public.messages to authenticated;
grant insert (patient_id, category, is_urgent, body) on public.messages to authenticated;
grant update (is_read) on public.messages to authenticated;
grant all on public.messages to service_role;

-- Lets the app show new messages live. Realtime still obeys the policies above.
alter publication supabase_realtime add table public.messages;