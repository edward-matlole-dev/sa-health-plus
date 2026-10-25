-- Aggregate-only reporting for clinic and super administrators. No patient
-- names, contact information, notes, or clinical readings are returned.
create index if not exists visits_clinic_date_idx on public.visits (clinic_id, visit_date desc);
create index if not exists appointments_clinic_status_date_idx on public.appointments (clinic_id, status, appointment_date);
create index if not exists sms_log_created_at_idx on public.sms_log (created_at desc);

create function public.clinic_analytics(
  p_days integer default 30,
  p_clinic uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role public.user_role := public.my_role();
  v_clinic uuid;
  v_daily jsonb;
begin
  if p_days not in (7, 30, 90) then
    raise exception 'Choose 7, 30, or 90 days' using errcode = '22023';
  end if;

  if v_role = 'super_admin' then
    v_clinic := p_clinic; -- null intentionally means every clinic
  elsif v_role = 'clinic_admin' then
    v_clinic := public.my_clinic_id();
  else
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  with dates as (
    select d::date as day
    from generate_series(
      (current_date - (p_days - 1))::timestamp,
      current_date::timestamp,
      interval '1 day'
    ) as d
  ),
  visits_by_day as (
    select v.visit_date::date as day, count(*)::int as visits,
           count(*) filter (where v.has_flagged_vitals)::int as flagged
    from public.visits v
    where v.visit_date >= current_date - (p_days - 1)
      and (v_clinic is null or v.clinic_id = v_clinic)
    group by v.visit_date::date
  ),
  registrations_by_day as (
    select p.created_at::date as day, count(*)::int as registrations
    from public.patients p
    where p.created_at >= current_date - (p_days - 1)
      and (v_clinic is null or p.clinic_id = v_clinic)
    group by p.created_at::date
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'day', d.day,
        'visits', coalesce(v.visits, 0),
        'flagged', coalesce(v.flagged, 0),
        'registrations', coalesce(r.registrations, 0)
      )
      order by d.day
    ),
    '[]'::jsonb
  ) into v_daily
  from dates d
  left join visits_by_day v on v.day = d.day
  left join registrations_by_day r on r.day = d.day;

  return jsonb_build_object(
    'days', p_days,
    'visits', (
      select count(*) from public.visits v
      where v.visit_date >= current_date - (p_days - 1)
        and (v_clinic is null or v.clinic_id = v_clinic)
    ),
    'flagged_vitals', (
      select count(*) from public.visits v
      where v.visit_date >= current_date - (p_days - 1)
        and v.has_flagged_vitals
        and (v_clinic is null or v.clinic_id = v_clinic)
    ),
    'new_patients', (
      select count(*) from public.patients p
      where p.created_at >= current_date - (p_days - 1)
        and (v_clinic is null or p.clinic_id = v_clinic)
    ),
    'appointments_scheduled', (
      select count(*) from public.appointments a
      where a.appointment_date >= current_date - (p_days - 1)
        and a.status = 'scheduled'
        and (v_clinic is null or a.clinic_id = v_clinic)
    ),
    'appointments_missed', (
      select count(*) from public.appointments a
      where a.appointment_date >= current_date - (p_days - 1)
        and a.status = 'missed'
        and (v_clinic is null or a.clinic_id = v_clinic)
    ),
    'sms_sent', (
      select count(*)
      from public.sms_log s
      join public.patients p on p.id = s.patient_id
      where s.created_at >= current_date - (p_days - 1)
        and s.status in ('sent', 'delivered')
        and (v_clinic is null or p.clinic_id = v_clinic)
    ),
    'sms_failed', (
      select count(*)
      from public.sms_log s
      join public.patients p on p.id = s.patient_id
      where s.created_at >= current_date - (p_days - 1)
        and s.status = 'failed'
        and (v_clinic is null or p.clinic_id = v_clinic)
    ),
    'daily', v_daily
  );
end
$$;

revoke execute on function public.clinic_analytics(integer, uuid) from public, anon;
grant execute on function public.clinic_analytics(integer, uuid) to authenticated, service_role;
