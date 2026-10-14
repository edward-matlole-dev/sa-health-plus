-- 1. Clinics: who can read and manage them ------------------------------
create policy clinics_read on public.clinics
  for select to authenticated
  using (public.my_role() = 'super_admin' or id = public.my_clinic_id());

create policy clinics_insert_super on public.clinics
  for insert to authenticated
  with check (public.my_role() = 'super_admin');

create policy clinics_update_super on public.clinics
  for update to authenticated
  using (public.my_role() = 'super_admin')
  with check (public.my_role() = 'super_admin');

revoke insert, update on public.clinics from authenticated;
grant insert (name, province, address) on public.clinics to authenticated;
grant update (name, province, address, is_active) on public.clinics to authenticated;

alter table public.clinics
  add constraint clinics_name_length check (char_length(name) between 2 and 100);
create unique index clinics_name_unique on public.clinics (lower(name));

-- 2. Switch a staff member on or off --------------------------------------
create function public.set_staff_active(p_user uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role := public.my_role();
  v_target public.profiles%rowtype;
begin
  if v_role is null or v_role not in ('clinic_admin', 'super_admin') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  select * into v_target from public.profiles where id = p_user;
  if not found or v_target.role = 'patient' then
    raise exception 'Staff member not found' using errcode = 'P0002';
  end if;

  if p_user = auth.uid() then
    raise exception 'You cannot change your own account' using errcode = '42501';
  end if;

  -- A clinic admin only reaches staff of their own clinic
  if v_role = 'clinic_admin' and v_target.clinic_id is distinct from public.my_clinic_id() then
    raise exception 'Staff member not found' using errcode = 'P0002';
  end if;

  -- Super admins are managed by hand in the dashboard, never from the app
  if v_target.role = 'super_admin' then
    raise exception 'Super admins cannot be changed here' using errcode = '42501';
  end if;

  update public.profiles set is_active = p_active where id = p_user;
end
$$;

-- 3. Switch a patient on or off (this also switches off their sign-in) ----
create function public.set_patient_active(p_patient uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role := public.my_role();
  v_patient public.patients%rowtype;
begin
  if v_role is null or v_role not in ('clinic_admin', 'super_admin') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  select * into v_patient from public.patients where id = p_patient;
  if not found
     or (v_role = 'clinic_admin' and v_patient.clinic_id is distinct from public.my_clinic_id()) then
    raise exception 'Patient not found' using errcode = 'P0002';
  end if;

  update public.patients set is_active = p_active where id = p_patient;
  if v_patient.user_id is not null then
    update public.profiles set is_active = p_active where id = v_patient.user_id;
  end if;
end
$$;

-- 4. Dashboard totals: numbers only, never records -------------------------
create function public.admin_stats(p_clinic uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role public.user_role := public.my_role();
  v_clinic uuid;
begin
  if v_role = 'super_admin' then
    v_clinic := p_clinic; -- null means all clinics
  elsif v_role = 'clinic_admin' then
    v_clinic := public.my_clinic_id();
  else
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'clinics', (select count(*) from public.clinics c
                where c.is_active and (v_clinic is null or c.id = v_clinic)),
    'staff', (select count(*) from public.profiles p
              where p.role in ('reception', 'nurse', 'clinic_admin') and p.is_active
                and (v_clinic is null or p.clinic_id = v_clinic)),
    'nurses', (select count(*) from public.profiles p
               where p.role = 'nurse' and p.is_active
                 and (v_clinic is null or p.clinic_id = v_clinic)),
    'patients', (select count(*) from public.patients p
                 where p.is_active and (v_clinic is null or p.clinic_id = v_clinic)),
    'visits_7d', (select count(*) from public.visits v
                  where v.visit_date > now() - interval '7 days'
                    and (v_clinic is null or v.clinic_id = v_clinic)),
    'visits_30d', (select count(*) from public.visits v
                   where v.visit_date > now() - interval '30 days'
                     and (v_clinic is null or v.clinic_id = v_clinic)),
    'flagged_7d', (select count(*) from public.visits v
                   where v.has_flagged_vitals and v.visit_date > now() - interval '7 days'
                     and (v_clinic is null or v.clinic_id = v_clinic)),
    'open_complaints', (select count(*) from public.complaints k
                        where k.status = 'open' and (v_clinic is null or k.clinic_id = v_clinic))
  );
end
$$;

-- 5. One row per clinic, for the super admin ---------------------------------
create function public.clinic_overview()
returns table (
  clinic_id uuid,
  name text,
  province text,
  is_active boolean,
  staff bigint,
  patients bigint,
  visits_30d bigint,
  flagged_7d bigint,
  open_complaints bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if public.my_role() is distinct from 'super_admin' then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  return query
  select c.id, c.name, c.province, c.is_active,
    (select count(*) from public.profiles p
     where p.clinic_id = c.id and p.role in ('reception', 'nurse', 'clinic_admin') and p.is_active),
    (select count(*) from public.patients p where p.clinic_id = c.id and p.is_active),
    (select count(*) from public.visits v
     where v.clinic_id = c.id and v.visit_date > now() - interval '30 days'),
    (select count(*) from public.visits v
     where v.clinic_id = c.id and v.has_flagged_vitals and v.visit_date > now() - interval '7 days'),
    (select count(*) from public.complaints k where k.clinic_id = c.id and k.status = 'open')
  from public.clinics c
  order by c.province, c.name;
end
$$;

revoke execute on function public.set_staff_active(uuid, boolean) from public, anon;
revoke execute on function public.set_patient_active(uuid, boolean) from public, anon;
revoke execute on function public.admin_stats(uuid) from public, anon;
revoke execute on function public.clinic_overview() from public, anon;
grant execute on function public.set_staff_active(uuid, boolean) to authenticated, service_role;
grant execute on function public.set_patient_active(uuid, boolean) to authenticated, service_role;
grant execute on function public.admin_stats(uuid) to authenticated, service_role;
grant execute on function public.clinic_overview() to authenticated, service_role;