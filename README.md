# SA Health+

A mobile-first digital health records platform for South African public primary health clinics. It replaces the paper patient book and the handwritten tick registers with one app for patients, nurses, reception staff and administrators, on phones and in the browser.

**Status:** a Richfield Faculty of IT, Year 3 IT Project by group Think Tech. It runs only on fictional test data. Do not enter real patient information before the privacy, consent and clinical-safety steps in `docs/RELEASE_CHECKLIST.md` are complete.

## What it does

| Role | What they can do |
|---|---|
| **Patient** | See their own visits, vital signs (in plain language), medication, appointments, blood tests and messages. Write to the clinic. Choose a language, SMS consent and app-notification choice. Change their PIN. |
| **Nurse** | Find patients, log visits (twelve visit categories with tick-sheets, vital signs with automatic flagging, medication, next appointment), order blood tests and record results, answer messages, send SMS reminders, reset a patient's PIN, and work from a dashboard of what needs attention. |
| **Reception** | Register patients and manage the live daily queue. |
| **Clinic admin** | Manage the staff and patient accounts of their clinic, resolve complaints, and see clinic totals and analytics. Cannot read clinical records. |
| **Super admin** | Manage clinics, see system totals and analytics for all clinics or one, filtered by province. |

## Highlights

- **Security in the database.** Row Level Security on every table, column-level permissions, audit fields set by the database, and append-only clinical records. A switched-off account loses access at once.
- **All-or-nothing visits.** A whole visit (vitals, ticks, medication, appointment) is saved in one transaction.
- **Automatic flagging of abnormal vital signs** (advisory, adult ranges; awaiting clinical sign-off).
- **Privacy on the patient's phone.** Plain-language wording, neutral labels for sensitive visits, no checklist or nurse notes, and HIV-related results kept for a nurse to explain.
- **Live updates** for the queue and messages (Supabase Realtime).
- **SMS reminders through Twilio** using four fixed templates that never contain health information, with a consent check, a limit of three an hour per patient, and a log of every message.
- **Random first PIN** for each patient, shown once to the registering staff member.
- **Five languages can be selected** (English, isiZulu, isiXhosa, Sesotho, Afrikaans). Only some screens are translated so far.
- **Responsive layout:** phone, tablet and a side-menu layout on large screens.

## Architecture

```
 One Expo / React Native app (TypeScript): Android, iOS and web
   |-- Patient area
   '-- Staff area (by role)
              |
              v
 Supabase (Central EU, Frankfurt)
   |-- Auth (JWT sessions)
   |-- Data API with Row Level Security
   |-- Realtime
   |-- Edge Functions: register-patient, register-staff,
   |                   reset-patient-pin, send-sms
   '-- PostgreSQL: 15 tables, functions, triggers
              |
              v
 Twilio SMS (called by send-sms)
```

The rules that matter (who may see what, vital sign flags, who recorded each entry, final results, message limits) live in the database, so a modified app cannot bypass them. Anything that needs a secret key (creating accounts, resetting PINs, sending SMS) runs in an Edge Function that checks who is calling.

## Tech stack

| Layer | Technology |
|---|---|
| App | TypeScript (strict), React Native 0.88, Expo SDK 58, Expo Router |
| State and text | Zustand, i18n-js, expo-localization |
| Backend | Supabase: PostgreSQL, Auth, Data API, Realtime, Edge Functions (Deno) |
| SMS | Twilio |
| Web hosting | Cloudflare Pages (static build) |
| Tooling | Git, npm, Supabase CLI, EAS (for Android builds) |

## Project structure

```
sa-health-plus/
├── src/
│   ├── app/                 screens and routes (Expo Router)
│   │   ├── (auth)/          sign-in
│   │   ├── (patient)/       patient tabs and screens
│   │   ├── (staff)/         nurse, reception and admin screens
│   │   └── change-password.tsx
│   ├── components/          shared UI, plus visit/, record/ and admin/
│   ├── stores/              Zustand stores (auth, patient, locale, unread counts, visit draft)
│   ├── i18n/                translations
│   ├── hooks/               responsive layout
│   ├── lib/supabase.ts      the single Supabase client
│   ├── utils/               ID validation, dates, search, password helpers
│   └── constants/           theme, vital signs, visit categories, provinces
├── supabase/
│   ├── migrations/          23 versioned SQL files: the database design as code
│   └── functions/           Edge Functions and shared helpers
├── scripts/                 test scripts (run against a Supabase project)
├── docs/                    release checklist, system documentation and demo runbook
├── app.json  eas.json  .env.example
```

## Getting started

### Prerequisites

- Node.js 24 and npm
- Git
- A free Supabase account (for the backend)
- Expo Go on an Android phone (it must support SDK 58), or just a desktop browser

### Run the app

```bash
git clone https://github.com/edward-matlole-dev/sa-health-plus.git
cd sa-health-plus
npm install
cp .env.example .env        # on Windows: copy .env.example .env
```

Edit `.env` and set the two public values from your Supabase project (Project settings, then API):

```
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=<your publishable (anon) key>
```

```bash
npx expo start              # scan the QR code with Expo Go, or press w for the web version
```

Never put a service-role key, a secret key or an SMS credential in `.env`. Anything starting with `EXPO_PUBLIC_` is visible to anyone who unpacks the app.

### Checks before every commit

```bash
npm run typecheck           # TypeScript, must print no errors
npm run lint
npx expo-doctor
```

Start `npx expo start` once before the type check if you add a new route: Expo generates the list of routes when the dev server starts.

## Set up the backend (Supabase)

1. **Create a project** named `sa-health-plus` (a region close to your users; the project uses Central EU).

2. **Project settings:** switch on the Data API, switch off "automatically expose new tables", and switch on automatic Row Level Security.

3. **Link and create the database:**
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push            # applies all 23 migrations in order
   ```

4. **Deploy the Edge Functions:**
   ```bash
   npx supabase functions deploy   # register-patient, register-staff, reset-patient-pin, send-sms
   ```

5. **SMS secrets** (only if you want SMS). Set them as server secrets, never in a file:
   ```bash
   npx supabase secrets set TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_MESSAGING_SERVICE_SID=...
   ```
   Without them, `send-sms` answers that SMS delivery is not configured. A Twilio trial account can only send to verified numbers.

6. **Authentication settings** (Supabase dashboard, Authentication):
   - switch off "allow new users to sign up". Every account is created by an administrator.
   - require the current password for password changes, if your plan offers it.

7. **Create the first super admin.** In Authentication, add a user with an email and a strong password (confirmed). Then, in the SQL editor:
   ```sql
   insert into public.profiles (id, role, first_name, last_name)
   select id, 'super_admin', 'First', 'Last'
   from auth.users
   where email = 'the email of the super admin';
   ```

8. **Sign in to the app** as the super admin (Staff tile), add a clinic, then add that clinic's admin. The clinic admin adds nurses and reception staff. Nurses register patients; each patient's first PIN is shown once at registration.

### Database in one paragraph

Fifteen tables (clinics, profiles, patients, visits, vitals, visit_indicators, medications, appointments, blood_tests, injections, messages, queue_entries, complaints, sms_log, patient_security_events), 45 access policies, SQL functions for saving a visit, the nurse inbox, switching accounts on or off, dashboard totals and clinic analytics, and triggers that set the sender, clinic, times, the person responsible, and the status of each reading. Change the database only through new migrations (`npx supabase migration new <name>`), never by editing tables by hand.

## Testing

The test scripts sign in as real users and call the real server, so they need a Supabase project with the migrations applied. Use a development project with fictional data only.

```bash
node --env-file=.env scripts/<script>.mjs
```

| Script | What it checks |
|---|---|
| `register-staff-test.mjs`, `register-staff-refusal-test.mjs` | Creating staff, and refusing a nurse |
| `register-patient-test.mjs` | Registration, ID validation, duplicates, who can see whom |
| `log-visit-test.mjs`, `log-visit-test-2.mjs` | Saving a visit, ticks, medication, bad input, and rollback |
| `profiles-read-test.mjs` | Who can read which profiles |
| `blood-tests-test.mjs` | The audit trail, final results and cancellation |
| `messages-test.mjs` | Message rules, the inbox, the rate limit and complaints |
| `admin-test.mjs` | Clinic isolation, switching accounts off, admin functions |

The scripts ask for credentials when they run and hide passwords as `*`. The Phase 5 project document lists every test case with its result.

## Deploy

### Web (Cloudflare Pages)

```bash
npx expo export --platform web      # creates the dist folder
```

Either upload `dist` in Cloudflare Pages, or connect this repository with build command `npx expo export --platform web` and output folder `dist`. If you connect the repository, add the two `EXPO_PUBLIC_` variables in the Cloudflare project settings, because `.env` is not in Git. If refreshing an inner page shows "not found", add a file `public/_redirects` containing `/* /index.html 200`.

### Android (EAS)

The configuration is in `eas.json`. Add an Android package name to `app.json`, set the two public variables in the EAS environment (the build service never sees your `.env`), then run `npx eas-cli build -p android --profile preview`. Free builds can queue for a long time, so start early.

Before a real release, work through `docs/RELEASE_CHECKLIST.md`.

## Security and privacy

- Row Level Security on every table. Each role reaches only what its work needs. Clinic admins and super admins see totals, never clinical records.
- Clinical records are append-only. Blood test results and resolved complaints are final. The database records who logged, ordered, resulted, wrote and resolved.
- Accounts are created only by administrators and staff through server functions. There is no public sign-up.
- A patient's first PIN is random. A PIN reset needs a nurse, is confirmed in person, and is written to an audit table that never stores the PIN.
- Staff passwords need at least 12 characters with upper and lower case, a number and a symbol.
- SMS uses fixed templates with no health information, requires the patient's consent, and is limited to three an hour per patient.
- All traffic uses TLS. Secrets live only on the server. No key or token is committed to this repository.

## Known limitations

- No PIN lockout (only the provider's rate limit), no forced change of the first PIN, and no second sign-in step for staff.
- The session is kept in ordinary device storage, not secure storage.
- No log of who viewed a record, no consent record and no retention policy yet.
- Only some screens are translated. The app-notification choice is saved but push notifications are not built.
- Reminders are sent manually by a nurse, not automatically on a schedule. There is no offline copy of records yet.
- Vital sign thresholds are adult ranges and need written approval from the clinical supervisor.
- The database is hosted in the EU, which needs a POPIA review before any real use.

## Conventions

- **Commits:** small, one thing each, with a prefix: `feat`, `fix`, `chore`, `docs`, `test`.
- **Type check** must print nothing before a commit.
- **Database:** migrations only. Row Level Security on for every table, permissions granted explicitly.
- **Secrets:** never in the repository. Only `EXPO_PUBLIC_` variables reach the app.
- **Accessibility:** every control has a role and a label, controls are at least 44 units tall, and every status uses an icon and words, never colour alone.

## Team and licence

Built by Think Tech for the Richfield Faculty of Information Technology, IT Project, Year 3 (2026).

Released under the MIT licence. See [LICENSE](LICENSE).