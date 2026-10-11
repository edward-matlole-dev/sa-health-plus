-- 1. The twelve visit categories, defined once in the database ----------
create function public.is_visit_category(p text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p = any (array[
    'womens_health', 'maternal_health', 'immunisation', 'chronic_care',
    'htc', 'ccmdd', 'mental_health', 'child_nutrition',
    'annual_wellness', 'acute_care', 'follow_up', 'specialist'
  ])
$$;

-- Move any earlier free-text values (test data) onto the new category keys
update public.visits
   set appointment_type = case appointment_type
     when 'Check-up' then 'annual_wellness'
     when 'Chronic follow-up' then 'chronic_care'
     when 'Antenatal' then 'maternal_health'
     when 'Family planning' then 'womens_health'
     when 'Child health' then 'child_nutrition'
     when 'Immunisation' then 'immunisation'
     when 'Medication collection' then 'chronic_care'
     else 'follow_up' end
 where not public.is_visit_category(appointment_type);

update public.appointments
   set type = case type
     when 'Check-up' then 'annual_wellness'
     when 'Chronic follow-up' then 'chronic_care'
     when 'Antenatal' then 'maternal_health'
     when 'Family planning' then 'womens_health'
     when 'Child health' then 'child_nutrition'
     when 'Immunisation' then 'immunisation'
     when 'Medication collection' then 'chronic_care'
     else 'follow_up' end
 where not public.is_visit_category(type);

alter table public.visits
  add constraint visits_category_valid check (public.is_visit_category(appointment_type));
alter table public.appointments
  add constraint appointments_category_valid check (public.is_visit_category(type));

-- 2. Who attended: a nurse or a doctor -----------------------------------
alter table public.visits
  add column attended_by text not null default 'nurse'
    check (attended_by in ('nurse', 'doctor'));
grant insert (attended_by) on public.visits to authenticated;

-- 3. Medication details: tablets or syrup ---------------------------------
alter table public.medications
  add column form text not null default 'tablet' check (form in ('tablet', 'syrup')),
  add column volume_ml numeric check (volume_ml > 0);
grant insert (form, volume_ml) on public.medications to authenticated;

-- 4. The tick-sheet: one tick is one row ----------------------------------
create table public.visit_indicators (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  indicator_key text not null check (indicator_key ~ '^[a-z0-9_]{2,60}$'),
  value numeric,
  created_at timestamptz not null default now(),
  unique (visit_id, indicator_key)
);
create index visit_indicators_key_idx on public.visit_indicators (indicator_key);

alter table public.visit_indicators enable row level security;

-- Nurses only: patients, reception and admins cannot read ticks
create policy visit_indicators_read_nurse on public.visit_indicators
  for select to authenticated
  using (
    public.my_role() = 'nurse'
    and exists (
      select 1 from public.visits v
      where v.id = visit_id and v.clinic_id = public.my_clinic_id()
    )
  );

create policy visit_indicators_insert_nurse on public.visit_indicators
  for insert to authenticated
  with check (
    public.my_role() = 'nurse'
    and exists (
      select 1 from public.visits v
      where v.id = visit_id and v.clinic_id = public.my_clinic_id()
    )
  );

grant select on public.visit_indicators to authenticated;
grant insert (visit_id, indicator_key, value) on public.visit_indicators to authenticated;
grant all on public.visit_indicators to service_role;

-- 5. A helper that checks a list of items from the app --------------------
create function public.jsonb_list_ok(p jsonb, p_max int)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p is null or jsonb_typeof(p) <> 'array' then return false; end if;
  if jsonb_array_length(p) > p_max then return false; end if;
  return not exists (
    select 1 from jsonb_array_elements(p) e where jsonb_typeof(e) <> 'object'
  );
end
$$;

-- 6. The extended all-or-nothing visit function ---------------------------
drop function public.log_visit(
  uuid, text, boolean, text, text, text, jsonb, jsonb, jsonb, jsonb, jsonb
);

create function public.log_visit(
  p_patient_id uuid,
  p_appointment_type text,
  p_glucose_fasting boolean default true,
  p_attended_by text default 'nurse',
  p_general_condition text default null,
  p_urine text default null,
  p_notes text default null,
  p_vitals jsonb default '[]'::jsonb,
  p_indicators jsonb default '[]'::jsonb,
  p_medications jsonb default '[]'::jsonb,
  p_injections jsonb default '[]'::jsonb,
  p_blood_tests jsonb default '[]'::jsonb,
  p_next_appointment jsonb default null
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_clinic uuid := public.my_clinic_id();
  v_visit uuid;
  v_appt_date date;
  v_appt_type text;
  v_result jsonb;
begin
  if public.my_role() is distinct from 'nurse' then
    raise exception 'Only nurses can log visits' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.patients
    where id = p_patient_id and clinic_id = v_clinic and is_active
  ) then
    raise exception 'Patient not found' using errcode = 'P0002';
  end if;

  p_vitals := coalesce(p_vitals, '[]'::jsonb);
  p_indicators := coalesce(p_indicators, '[]'::jsonb);
  p_medications := coalesce(p_medications, '[]'::jsonb);
  p_injections := coalesce(p_injections, '[]'::jsonb);
  p_blood_tests := coalesce(p_blood_tests, '[]'::jsonb);

  -- Check all the input before saving anything
  if not coalesce(public.is_visit_category(p_appointment_type), false) then
    raise exception 'Choose a valid visit category' using errcode = '22023';
  end if;

  if p_attended_by is null or p_attended_by not in ('nurse', 'doctor') then
    raise exception 'Attended by must be nurse or doctor' using errcode = '22023';
  end if;

  if char_length(coalesce(p_general_condition, '')) > 200
     or char_length(coalesce(p_urine, '')) > 200
     or char_length(coalesce(p_notes, '')) > 2000 then
    raise exception 'A text field is too long' using errcode = '22023';
  end if;

  if not public.jsonb_list_ok(p_vitals, 12)
     or not public.jsonb_list_ok(p_indicators, 80)
     or not public.jsonb_list_ok(p_medications, 20)
     or not public.jsonb_list_ok(p_injections, 10)
     or not public.jsonb_list_ok(p_blood_tests, 20) then
    raise exception 'Invalid visit details' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_indicators) e
    where coalesce(e->>'key', '') !~ '^[a-z0-9_]{2,60}$'
  ) then
    raise exception 'Invalid indicator' using errcode = '22023';
  end if;

  if (select count(distinct e->>'key') from jsonb_array_elements(p_indicators) e)
     <> jsonb_array_length(p_indicators) then
    raise exception 'Each indicator can only be ticked once' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_medications) e
    where btrim(coalesce(e->>'name', '')) = '' or char_length(e->>'name') > 100
  ) then
    raise exception 'Each medication needs a name' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_injections) e
    where btrim(coalesce(e->>'name', '')) = '' or char_length(e->>'name') > 100
  ) then
    raise exception 'Each injection needs a name' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_blood_tests) e
    where btrim(coalesce(e->>'test_name', '')) = '' or char_length(e->>'test_name') > 100
  ) then
    raise exception 'Each blood test needs a name' using errcode = '22023';
  end if;

  if p_next_appointment is not null and jsonb_typeof(p_next_appointment) = 'object' then
    v_appt_date := (p_next_appointment->>'appointment_date')::date;
    if v_appt_date is null or v_appt_date < current_date then
      raise exception 'The next appointment date cannot be in the past' using errcode = '22023';
    end if;
    v_appt_type := coalesce(nullif(btrim(p_next_appointment->>'type'), ''), p_appointment_type);
    if not coalesce(public.is_visit_category(v_appt_type), false) then
      raise exception 'The next appointment type is not valid' using errcode = '22023';
    end if;
  end if;

  -- The visit, logged under the nurse's own name
  insert into public.visits
    (patient_id, clinic_id, logged_by, appointment_type, attended_by, glucose_fasting,
     general_condition, urine, notes)
  values
    (p_patient_id, v_clinic, auth.uid(), p_appointment_type, p_attended_by,
     coalesce(p_glucose_fasting, true),
     nullif(btrim(p_general_condition), ''), nullif(btrim(p_urine), ''),
     nullif(btrim(p_notes), ''))
  returning id into v_visit;

  -- Vitals: the database decides each reading's status
  insert into public.vitals (visit_id, type, value, unit)
  select v_visit, e->>'type', (e->>'value')::numeric, e->>'unit'
  from jsonb_array_elements(p_vitals) as e;

  -- The tick-sheet
  insert into public.visit_indicators (visit_id, indicator_key, value)
  select v_visit, e->>'key', nullif(e->>'value', '')::numeric
  from jsonb_array_elements(p_indicators) as e;

  -- Medications: the next collection date is worked out from the supply days
  insert into public.medications
    (patient_id, visit_id, name, dosage, frequency, supply_days, next_collection, form, volume_ml)
  select p_patient_id, v_visit, btrim(e->>'name'),
         nullif(btrim(e->>'dosage'), ''), nullif(btrim(e->>'frequency'), ''),
         nullif(e->>'supply_days', '')::int,
         coalesce(
           nullif(e->>'next_collection', '')::date,
           case when nullif(e->>'supply_days', '') is not null
                then current_date + (e->>'supply_days')::int end
         ),
         coalesce(nullif(e->>'form', ''), 'tablet'),
         nullif(e->>'volume_ml', '')::numeric
  from jsonb_array_elements(p_medications) as e;

  insert into public.injections (patient_id, visit_id, name, next_due, nurse_tip)
  select p_patient_id, v_visit, btrim(e->>'name'),
         nullif(e->>'next_due', '')::date, nullif(btrim(e->>'nurse_tip'), '')
  from jsonb_array_elements(p_injections) as e;

  insert into public.blood_tests (patient_id, visit_id, test_name, category, due_date)
  select p_patient_id, v_visit, btrim(e->>'test_name'),
         nullif(btrim(e->>'category'), ''), nullif(e->>'due_date', '')::date
  from jsonb_array_elements(p_blood_tests) as e;

  if v_appt_date is not null then
    insert into public.appointments
      (patient_id, clinic_id, visit_id, appointment_date, type, prep_notes, priority)
    values
      (p_patient_id, v_clinic, v_visit, v_appt_date, v_appt_type,
       nullif(btrim(p_next_appointment->>'prep_notes'), ''),
       coalesce(nullif(p_next_appointment->>'priority', ''), 'normal'));
  end if;

  -- The answer: the visit and the status the database gave each reading
  select jsonb_build_object(
    'visit_id', v_visit,
    'has_flagged_vitals',
      (select has_flagged_vitals from public.visits where id = v_visit),
    'vitals',
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'type', type, 'value', value, 'unit', unit,
            'status', status, 'flag_code', flag_code)
          order by type)
        from public.vitals where visit_id = v_visit
      ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end
$$;

revoke execute on function public.log_visit(
  uuid, text, boolean, text, text, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb
) from public, anon;
grant execute on function public.log_visit(
  uuid, text, boolean, text, text, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb
) to authenticated, service_role;