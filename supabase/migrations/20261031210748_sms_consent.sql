-- SMS consent is opt-in: nothing is switched on until the patient agrees.
alter table public.patients
  add column sms_consent_at timestamptz;

alter table public.patients
  alter column sms_enabled set default false;

-- The database records when consent was given, and clears it when consent is withdrawn.
create function public.patients_stamp_sms_consent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.sms_consent_at := case when new.sms_enabled then now() else null end;
  elsif new.sms_enabled and not old.sms_enabled then
    new.sms_consent_at := now();
  elsif not new.sms_enabled then
    new.sms_consent_at := null;
  end if;
  return new;
end
$$;

create trigger patients_sms_consent
  before insert or update of sms_enabled on public.patients
  for each row execute function public.patients_stamp_sms_consent();

-- Existing patients have no recorded consent, so SMS stays off until it is recorded.
update public.patients set sms_enabled = false;