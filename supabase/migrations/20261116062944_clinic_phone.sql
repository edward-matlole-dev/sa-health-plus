-- A clinic can have a phone number, shown to its patients on the Emergency screen.
alter table public.clinics
  add column phone text
  constraint clinics_phone_format check (phone ~ '^(\+27|0)[0-9]{9}$');

-- Only a super admin can change clinics. The existing access rules already say so,
-- so this only adds the new column to the permitted columns.
grant insert (phone) on public.clinics to authenticated;
grant update (phone) on public.clinics to authenticated;