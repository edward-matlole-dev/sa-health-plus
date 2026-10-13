-- 1. Stricter rules for new messages, enforced by the database ------------
create or replace function public.messages_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.body := btrim(new.body);
  if new.body = '' then
    raise exception 'A message cannot be empty' using errcode = '22023';
  end if;

  -- The database fills in the clinic, the sender and the sender's role
  select clinic_id into new.clinic_id
  from public.patients where id = new.patient_id;

  new.sender_id := auth.uid();
  new.sender_role := case when public.my_role() = 'patient' then 'patient' else 'staff' end;

  if new.sender_role = 'patient' then
    -- An emergency message is always urgent
    if new.category = 'emergency' then
      new.is_urgent := true;
    end if;

    -- At most 20 messages an hour from one patient
    if (select count(*) from public.messages m
        where m.sender_id = new.sender_id
          and m.created_at > now() - interval '1 hour') >= 20 then
      raise exception 'You are sending messages too quickly. Please wait a while.'
        using errcode = '53400';
    end if;
  end if;

  return new;
end
$$;

-- 2. The nurse's inbox: one row per patient who has messages --------------
-- It runs with the caller's own rights, so a nurse only ever sees her own clinic.
create function public.message_inbox()
returns table (
  patient_id uuid,
  first_name text,
  last_name text,
  patient_number text,
  last_body text,
  last_at timestamptz,
  last_sender_role text,
  unread_count bigint,
  urgent_unread boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id, p.first_name, p.last_name, p.patient_number,
         l.body, l.created_at, l.sender_role,
         coalesce(u.unread, 0), coalesce(u.urgent, false)
  from public.patients p
  join lateral (
    select m.body, m.created_at, m.sender_role
    from public.messages m
    where m.patient_id = p.id
    order by m.created_at desc
    limit 1
  ) l on true
  left join lateral (
    select count(*) as unread, bool_or(m.is_urgent) as urgent
    from public.messages m
    where m.patient_id = p.id and m.sender_role = 'patient' and not m.is_read
  ) u on true
  order by coalesce(u.urgent, false) desc,
           (coalesce(u.unread, 0) > 0) desc,
           l.created_at desc
  limit 100
$$;

revoke execute on function public.message_inbox() from public, anon;
grant execute on function public.message_inbox() to authenticated, service_role;