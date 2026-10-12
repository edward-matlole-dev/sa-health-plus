alter table public.blood_tests
  add column ordered_by uuid references public.profiles(id),
  add column resulted_by uuid references public.profiles(id),
  add column cancelled_at timestamptz,
  add constraint blood_tests_text_lengths check (
    char_length(test_name) <= 100
    and char_length(coalesce(result, '')) <= 50
    and char_length(coalesce(unit, '')) <= 20),
  add constraint blood_tests_not_both check (not (result is not null and cancelled_at is not null));

-- A nurse may cancel a mistaken order. Who ordered it and who resulted it are set only by the database.
grant update (cancelled_at) on public.blood_tests to authenticated;

create function public.blood_tests_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.ordered_by := auth.uid();
  return new;
end
$$;

create trigger blood_tests_set_orderer
  before insert on public.blood_tests
  for each row execute function public.blood_tests_before_insert();

create function public.blood_tests_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- A recorded result is final. A correction means ordering a new test.
  if old.result is not null
     and (new.result is distinct from old.result or new.unit is distinct from old.unit) then
    raise exception 'A recorded result cannot be changed' using errcode = '42501';
  end if;

  if old.cancelled_at is not null then
    if new.cancelled_at is distinct from old.cancelled_at then
      raise exception 'A cancelled test cannot be changed' using errcode = '42501';
    end if;
    if new.result is not null then
      raise exception 'A cancelled test cannot receive a result' using errcode = '42501';
    end if;
  end if;

  -- The database records who entered the result and when
  if new.result is not null and old.result is null then
    new.resulted_by := auth.uid();
    new.tested_at := now();
  end if;

  if new.cancelled_at is not null and old.cancelled_at is null then
    new.cancelled_at := now();
  end if;

  return new;
end
$$;

create trigger blood_tests_guard_update
  before update on public.blood_tests
  for each row execute function public.blood_tests_before_update();