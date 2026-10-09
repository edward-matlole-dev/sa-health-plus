-- 1. Visit-level fields -------------------------------------------------
alter table public.visits
  add column glucose_fasting boolean not null default true,
  add column has_flagged_vitals boolean not null default false;

grant insert (glucose_fasting) on public.visits to authenticated;

-- 2. Vitals: replace the manual flag columns with automatic ones ----------
-- (the table is still empty, so nothing is lost)
alter table public.vitals
  drop column flagged,
  drop column severity;

alter table public.vitals
  add column status text not null default 'normal'
    check (status in ('normal', 'elevated', 'high', 'low', 'crisis')),
  add column flag_code text;

alter table public.vitals
  add column flagged boolean generated always as (status <> 'normal') stored,
  add column severity text generated always as (
    case status when 'normal' then 'normal'
                when 'crisis' then 'critical'
                else 'warning' end
  ) stored;

-- Reject impossible values (input validation, not a clinical flag)
alter table public.vitals add constraint vitals_value_plausible check (
  case type
    when 'bp_systolic'  then value between 40 and 300
    when 'bp_diastolic' then value between 20 and 200
    when 'pulse'        then value between 20 and 250
    when 'temperature'  then value between 25 and 45
    when 'weight'       then value between 0.5 and 400
    when 'height'       then value between 30 and 250
    when 'spo2'         then value between 50 and 100
    when 'glucose'      then value between 0.5 and 60
    when 'bmi'          then value between 5 and 100
    when 'muac'         then value between 3 and 60
    when 'haemoglobin'  then value between 2 and 25
    when 'respiration'  then value between 4 and 80
    else false
  end
);

-- 3. Blood pressure rule (judged as a pair) ------------------------------
create function public.evaluate_bp(p_sys numeric, p_dia numeric)
returns table (out_status text, out_code text)
language sql
immutable
set search_path = ''
as $$
  select
    case
      when p_sys >= 180 or p_dia >= 120 then 'crisis'
      when p_sys >= 160 or p_dia >= 100 then 'high'
      when p_sys >= 140 or p_dia >= 90  then 'elevated'
      when p_sys < 90   or p_dia < 60   then 'low'
      else 'normal'
    end,
    case
      when p_sys >= 180 or p_dia >= 120 then 'hypertensive_crisis'
      when p_sys >= 160 or p_dia >= 100 then 'high_bp'
      when p_sys >= 140 or p_dia >= 90  then 'elevated_bp'
      when p_sys < 90   or p_dia < 60   then 'low_bp'
      else null
    end
$$;

-- 4. All other measurements ----------------------------------------------
create function public.evaluate_vital(
  p_type text, p_value numeric, p_fasting boolean, p_gender text)
returns table (out_status text, out_code text)
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_status text := 'normal';
  v_code text := null;
begin
  if p_type = 'glucose' then
    if p_fasting then
      if    p_value >= 11.1 then v_status := 'crisis';   v_code := 'very_high_glucose';
      elsif p_value >= 7.0  then v_status := 'high';     v_code := 'high_glucose';
      elsif p_value >= 6.1  then v_status := 'elevated'; v_code := 'pre_diabetic_range';
      elsif p_value < 3.9   then v_status := 'low';      v_code := 'low_glucose';
      end if;
    else
      if    p_value >= 11.1 then v_status := 'high'; v_code := 'high_glucose';
      elsif p_value < 3.9   then v_status := 'low';  v_code := 'low_glucose';
      end if;
    end if;

  elsif p_type = 'temperature' then
    if    p_value >= 39.5 then v_status := 'crisis';   v_code := 'high_fever';
    elsif p_value >= 38.0 then v_status := 'high';     v_code := 'fever';
    elsif p_value >= 37.5 then v_status := 'elevated'; v_code := 'slightly_high_temp';
    elsif p_value < 35.0  then v_status := 'low';      v_code := 'hypothermia';
    end if;

  elsif p_type = 'spo2' then
    if    p_value < 90 then v_status := 'crisis'; v_code := 'critical_spo2';
    elsif p_value < 94 then v_status := 'low';    v_code := 'low_spo2';
    end if;

  elsif p_type = 'pulse' then
    if    p_value >= 130 then v_status := 'crisis'; v_code := 'very_high_pulse';
    elsif p_value >= 100 then v_status := 'high';   v_code := 'high_pulse';
    elsif p_value < 40   then v_status := 'crisis'; v_code := 'very_low_pulse';
    elsif p_value < 60   then v_status := 'low';    v_code := 'low_pulse';
    end if;

  elsif p_type = 'respiration' then
    if    p_value >= 30 then v_status := 'crisis'; v_code := 'very_high_rr';
    elsif p_value >= 24 then v_status := 'high';   v_code := 'high_rr';
    elsif p_value < 8   then v_status := 'crisis'; v_code := 'very_low_rr';
    elsif p_value < 12  then v_status := 'low';    v_code := 'low_rr';
    end if;

  elsif p_type = 'bmi' then
    if    p_value >= 40.0 then v_status := 'crisis';   v_code := 'severely_obese';
    elsif p_value >= 30.0 then v_status := 'high';     v_code := 'obese';
    elsif p_value >= 25.0 then v_status := 'elevated'; v_code := 'overweight';
    elsif p_value < 16.0  then v_status := 'crisis';   v_code := 'severely_underweight';
    elsif p_value < 18.5  then v_status := 'low';      v_code := 'underweight';
    end if;

  elsif p_type = 'muac' then
    if    p_value < 11.5 then v_status := 'crisis';   v_code := 'severe_malnutrition';
    elsif p_value < 12.5 then v_status := 'high';     v_code := 'moderate_malnutrition';
    elsif p_value < 13.5 then v_status := 'elevated'; v_code := 'at_risk_malnutrition';
    end if;

  elsif p_type = 'haemoglobin' then
    if    p_value < 8.0 then v_status := 'crisis'; v_code := 'critical_low_hb';
    elsif p_value < (case when p_gender = 'female' then 12.0 else 13.0 end)
                        then v_status := 'low';    v_code := 'low_hb';
    elsif p_value > 17.5 then v_status := 'high';  v_code := 'high_hb';
    end if;
  end if;
  -- weight and height are recorded but never flagged

  return query select v_status, v_code;
end
$$;

revoke execute on function public.evaluate_bp(numeric, numeric) from public, anon;
revoke execute on function public.evaluate_vital(text, numeric, boolean, text) from public, anon;
grant execute on function public.evaluate_bp(numeric, numeric) to authenticated, service_role;
grant execute on function public.evaluate_vital(text, numeric, boolean, text) to authenticated, service_role;

-- 5. Triggers: the database sets the status, the app cannot ---------------
create function public.vitals_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fasting boolean;
  v_gender text;
begin
  select v.glucose_fasting, p.gender into v_fasting, v_gender
  from public.visits v
  join public.patients p on p.id = v.patient_id
  where v.id = new.visit_id;

  if new.type in ('bp_systolic', 'bp_diastolic') then
    -- settled in the after-insert step, once both readings exist
    new.status := 'normal';
    new.flag_code := null;
  else
    select e.out_status, e.out_code into new.status, new.flag_code
    from public.evaluate_vital(new.type, new.value, coalesce(v_fasting, true), v_gender) e;
  end if;
  return new;
end
$$;

create function public.vitals_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sys numeric;
  v_dia numeric;
  r record;
begin
  if new.type in ('bp_systolic', 'bp_diastolic') then
    select value into v_sys from public.vitals
      where visit_id = new.visit_id and type = 'bp_systolic';
    select value into v_dia from public.vitals
      where visit_id = new.visit_id and type = 'bp_diastolic';

    if v_sys is not null and v_dia is not null then
      select e.out_status, e.out_code into r from public.evaluate_bp(v_sys, v_dia) e;
      update public.vitals
         set status = r.out_status, flag_code = r.out_code
       where visit_id = new.visit_id and type in ('bp_systolic', 'bp_diastolic');
    end if;
  end if;

  update public.visits
     set has_flagged_vitals = exists (
       select 1 from public.vitals
       where visit_id = new.visit_id and status <> 'normal')
   where id = new.visit_id;

  return null;
end
$$;

revoke execute on function public.vitals_before_insert() from public, anon, authenticated;
revoke execute on function public.vitals_after_insert() from public, anon, authenticated;

create trigger vitals_set_status
  before insert on public.vitals
  for each row execute function public.vitals_before_insert();

create trigger vitals_flag_visit
  after insert on public.vitals
  for each row execute function public.vitals_after_insert();