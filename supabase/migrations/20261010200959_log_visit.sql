create function public.log_visit(
  p_patient_id uuid,
  p_appointment_type text,
  p_glucose_fasting boolean default true,
  p_general_condition text default null,
  p_urine text default null,
  p_notes text default null,
  p_vitals jsonb default '[]'::jsonb,
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
  v_result jsonb;
begin
  -- Only nurses log visits (the table rules would refuse anyone else anyway)
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
  p_medications := coalesce(p_medications, '[]'::jsonb);
  p_injections := coalesce(p_injections, '[]'::jsonb);
  p_blood_tests := coalesce(p_blood_tests, '[]'::jsonb);

  -- Check all the input before saving anything
  if coalesce(btrim(p_appointment_type), '') = '' or char_length(p_appointment_type) > 100 then
    raise exception 'Appointment type is required' using errcode = '22023';
  end if;

  if char_length(coalesce(p_general_condition, '')) > 200
     or char_length(coalesce(p_urine, '')) > 200
     or char_length(coalesce(p_notes, '')) > 2000 then
    raise exception 'A text field is too long' using errcode = '22023';
  end if;

  if (case when jsonb_typeof(p_vitals) = 'array' then jsonb_array_length(p_vitals) else 999 end) > 12
     or (case when jsonb_typeof(p_medications) = 'array' then jsonb_array_length(p_medications) else 999 end) > 20
     or (case when jsonb_typeof(p_injections) = 'array' then jsonb_array_length(p_injections) else 999 end) > 10
     or (case when jsonb_typeof(p_blood_tests) = 'array' then jsonb_array_length(p_blood_tests) else 999 end) > 20 then
    raise exception 'Invalid visit details' using errcode = '22023';
  end if;

  if p_next_appointment is not null and jsonb_typeof(p_next_appointment) = 'object' then
    v_appt_date := (p_next_appointment->>'appointment_date')::date;
    if v_appt_date is null or v_appt_date < current_date then
      raise exception 'The next appointment date cannot be in the past' using errcode = '22023';
    end if;
  end if;

  -- The visit, logged under the nurse's own name
  insert into public.visits
    (patient_id, clinic_id, logged_by, appointment_type, glucose_fasting,
     general_condition, urine, notes)
  values
    (p_patient_id, v_clinic, auth.uid(), btrim(p_appointment_type),
     coalesce(p_glucose_fasting, true),
     nullif(btrim(p_general_condition), ''), nullif(btrim(p_urine), ''),
     nullif(btrim(p_notes), ''))
  returning id into v_visit;

  -- Vitals: the database decides each reading's status
  insert into public.vitals (visit_id, type, value, unit)
  select v_visit, e->>'type', (e->>'value')::numeric, e->>'unit'
  from jsonb_array_elements(p_vitals) as e;

  insert into public.medications
    (patient_id, visit_id, name, dosage, frequency, supply_days, next_collection)
  select p_patient_id, v_visit, e->>'name', nullif(e->>'dosage', ''), nullif(e->>'frequency', ''),
         nullif(e->>'supply_days', '')::int, nullif(e->>'next_collection', '')::date
  from jsonb_array_elements(p_medications) as e;

  insert into public.injections (patient_id, visit_id, name, next_due, nurse_tip)
  select p_patient_id, v_visit, e->>'name',
         nullif(e->>'next_due', '')::date, nullif(e->>'nurse_tip', '')
  from jsonb_array_elements(p_injections) as e;

  insert into public.blood_tests (patient_id, visit_id, test_name, category, due_date)
  select p_patient_id, v_visit, e->>'test_name', nullif(e->>'category', ''),
         nullif(e->>'due_date', '')::date
  from jsonb_array_elements(p_blood_tests) as e;

  if v_appt_date is not null then
    insert into public.appointments
      (patient_id, clinic_id, visit_id, appointment_date, type, prep_notes, priority)
    values
      (p_patient_id, v_clinic, v_visit, v_appt_date,
       coalesce(nullif(p_next_appointment->>'type', ''), btrim(p_appointment_type)),
       nullif(p_next_appointment->>'prep_notes', ''),
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
  uuid, text, boolean, text, text, text, jsonb, jsonb, jsonb, jsonb, jsonb
) from public, anon;
grant execute on function public.log_visit(
  uuid, text, boolean, text, text, text, jsonb, jsonb, jsonb, jsonb, jsonb
) to authenticated, service_role;