# SA Health+ system documentation

## 1. Purpose and current status

SA Health+ is a mobile-first clinic records application for South African patients and clinic teams. It has separate, role-protected experiences for patients, reception staff, nurses, clinic administrators, and super administrators.

The source code, database migrations, Edge Functions, EAS build profiles, and release checklist are present in this repository. The app is **not yet deployed as a production service**. Before real patients use it, the release owner must create the production Supabase and Expo projects, apply the migrations, deploy the Edge Functions, configure SMS credentials, and complete the release steps in [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md).

## 2. What the system does

### Patient experience

A patient signs in using their clinic-issued patient number (`SA-` followed by seven digits) and a six-digit PIN. The patient app provides:

- **Home:** a responsive health snapshot with the next appointment, latest vital readings, active medication, and pending blood tests.
- **Check-ups:** visit and vital-sign history, including status indicators where readings need attention.
- **Medication:** active and previous medication, instructions, and collection information.
- **Messages:** private clinic conversations, categories, urgency labels, live unread counts, and read receipts for staff replies.
- **Settings:** six-digit PIN change, SMS consent, app-notification consent, language choice, and sign-out.
- **Detail screens:** complete appointment and blood-test histories.

Patients can use the app on phones, tablets, and desktop browsers. On phone-sized devices, the bottom navigation bar reserves the Android/iOS safe area so its labels and icons remain above system navigation controls.

### Clinic-staff experience

The staff workspace uses the same visual system as the patient app but presents denser operational data. Desktop layouts use a left navigation rail; phones use a safe-area-aware bottom bar.

| Role | Available work |
| --- | --- |
| Reception | Register a patient, add and manage the clinic queue. |
| Nurse | Nurse dashboard, registration and queue, patient search and records, clinical visits, patient conversations, and consent-gated SMS reminders. |
| Clinic administrator | Operational dashboard, staff management, patient-account management, complaints, and aggregate clinic analytics. |
| Super administrator | Operational dashboard, clinic management, staff management, and aggregate analytics across authorised clinics. |

#### Staff workflows

- **Register patient:** reception or a nurse records the patient’s demographic details, validates the South African ID number and phone number, and receives a randomly generated six-digit first PIN to share privately.
- **Queue:** staff search for an active patient, add a reason and normal/urgent priority, and progress the queue through waiting and consultation states.
- **Nurse dashboard:** shows queue counts, recent flagged visits, overdue blood tests, appointments past due, and medication collections due. Each patient row opens the appropriate clinical record.
- **Patient record:** brings together appointments, check-ups and vitals, medications, blood tests, injections, and clinical actions for an authorised nurse.
- **Log visit:** guides the nurse through visit details, vital signs, medication, appointment and test activity before saving the visit.
- **Conversation:** a nurse can review a patient’s messages, mark incoming messages read, call the patient, open their record, and send a reply.
- **SMS reminder:** a nurse or reception worker selects a fixed, safe reminder type. The screen makes clear whether the patient has consented to SMS.
- **Staff and clinics:** authorised administrators can create, activate, deactivate, and organise staff and clinic accounts.
- **Complaints:** clinic administrators can review open complaints and record an immutable resolution note.
- **Analytics:** clinic and super administrators see aggregate service counts only; no patient records are exposed on this screen.

## 3. Main user journeys

### Patient registration and first sign-in

1. Reception or a nurse signs in as staff and opens **Register patient**.
2. The app validates the first name, last name, South African ID number, and local phone number.
3. The `register-patient` Edge Function creates a Supabase Auth user, profile, and patient record in the caller’s clinic.
4. The function returns a unique patient number and random six-digit PIN once. Staff provide them privately to the patient.
5. The patient signs in with those credentials and should change the PIN in Settings.

### A nurse records care

1. The nurse finds the patient through the patient list, queue, dashboard, or an alert card.
2. The nurse reviews the existing record and starts a visit.
3. The visit flow captures the selected care category, readings, and relevant follow-up records.
4. Saved visits and vital statuses are available to the patient and contribute to nurse-review and aggregate analytics views.

### A safe SMS reminder

1. A nurse or reception worker opens the patient record and chooses **Send SMS**.
2. The app allows only appointment, medication, blood-test, or important-clinic-update reminder categories.
3. The `send-sms` Edge Function verifies the caller’s role, clinic, active patient status, consent, and rate limit.
4. The function records a queued SMS log, sends a generic template through Twilio, and stores the final outcome.
5. No diagnosis, test result, patient name, patient number, or appointment date is placed in an SMS message.

## 4. Architecture

```text
Expo / React Native application
  ├─ Expo Router file-based screens (src/app)
  ├─ Reusable responsive components (src/components)
  ├─ Zustand session, patient, locale and unread-message stores (src/stores)
  ├─ Supabase JavaScript client (src/lib)
  └─ Supabase backend
      ├─ Auth
      ├─ PostgreSQL data and Row Level Security policies
      ├─ SQL migrations (supabase/migrations)
      ├─ RPC functions
      ├─ Realtime subscriptions for messages
      └─ Edge Functions for privileged operations
```

### Client application

- **Framework:** Expo SDK 58, React Native 0.88, React 19, TypeScript, and Expo Router.
- **Navigation:** all screen routes are in `src/app/`; layouts define protected authentication, patient, staff, stack, and tab navigation.
- **Responsive design:** `useResponsiveLayout` and responsive component sizing provide phone, tablet, and desktop layouts. The app switches from bottom tabs to desktop navigation rails at wider viewport sizes.
- **Design system:** `src/constants/theme.ts` defines the shared colours, typography, spacing, radii, and elevation. `staffColors` maps staff UI to the same product palette as the patient app while preserving denser workflow cards.
- **State:** Zustand stores manage authentication, current patient data, selected language, and message unread counts. AsyncStorage retains only the last known role for an offline session restore; it does not store service credentials.
- **Internationalisation:** patient-facing text supports English, isiZulu, isiXhosa, Sesotho, and Afrikaans. The chosen language is persisted per user.

### Backend

Supabase is the system of record. The migration history in `supabase/migrations` covers:

- clinics and profiles/roles;
- patients and active-account control;
- visits, vital signs, visit indicators, medications, appointments, injections, and blood tests;
- messages, queue entries, complaints, and SMS logs;
- clinic management functions and staff visibility rules;
- clinic analytics and patient-security audit events.

The app calls Supabase directly only for actions covered by database permissions. Operations requiring elevated privileges use server-side Edge Functions. The mobile app must use the public/publishable Supabase key only; a service-role key is never shipped to the client.

## 5. Authentication, access, and security

### Authentication model

- **Patients:** authenticate with a synthetic internal email derived from their patient number plus a six-digit PIN. The email is an implementation detail and is not presented as a patient-facing credential.
- **Staff:** authenticate with their email address and password.
- **Role check:** after every sign-in, the app reads the signed-in user’s active profile and rejects inactive or wrong-area accounts. Patient credentials cannot enter staff screens, and staff credentials cannot enter patient screens.
- **Route protection:** the root Expo Router layout exposes only the appropriate patient or staff route group for the authenticated role.

### Password and PIN changes

The shared change-password screen requires the current credential before accepting a replacement:

- patient PINs must be exactly six digits;
- staff passwords must be at least 12 characters and include upper- and lowercase letters, a number, and a symbol;
- the replacement must be confirmed and cannot match the current value;
- the client sends `current_password` with the update request so it works with Supabase’s current-password verification setting.

Production Supabase settings must enforce the equivalent rules, current-password verification, and leaked-password protection where available.

### Privileged Edge Functions

| Function | What it does | Server-side controls |
| --- | --- | --- |
| `register-patient` | Creates patient Auth user, profile and patient record. | Requires nurse/reception role and clinic; validates ID and phone; creates a random PIN; rolls back Auth user on partial failure. |
| `register-staff` | Creates staff Auth user and profile. | Requires clinic/super admin role; validates strong password; restricts clinic selection. |
| `reset-patient-pin` | Resets a patient PIN. | Requires nurse/reception role and matching clinic; creates a patient-security audit event. |
| `send-sms` | Sends a non-sensitive clinic reminder through Twilio. | Requires nurse/reception role and matching clinic; enforces consent, patient active status, and a three-per-hour limit; logs queued, sent, or failed outcome. |

### Privacy safeguards

- SMS templates are intentionally generic and do not reveal diagnoses, results, patient identifiers, or dates.
- Analytics are aggregate service data only.
- Roles and clinic IDs are checked server-side for Edge Functions and should also be enforced by Supabase Row Level Security policies.
- Provider credentials, database service-role keys, and production secrets belong in Supabase/EAS secrets, never in `.env` committed to Git.
- This application handles health information. A production rollout requires clinical safety review, POPIA/privacy review, consent wording, retention policy, access-control review, incident process, and staff training.

## 6. Data areas

| Area | Examples of information |
| --- | --- |
| Clinic and identity | clinics, staff profiles, roles, active state, patient numbers. |
| Patient profile | names, ID number, phone, date of birth, gender, consent choices. |
| Clinical care | visits, categories, vital readings/statuses, medications, injections, appointments, blood tests. |
| Operations | queue state, complaints and resolutions, clinic/staff activation. |
| Communication | in-app messages/read state and SMS delivery log. |
| Audit and reporting | patient PIN-reset events and aggregate clinic analytics. |

## 7. Repository guide

| Location | Responsibility |
| --- | --- |
| `src/app/` | Expo Router screens and route layouts. |
| `src/app/(patient)/` | Patient tabs and detail screens. |
| `src/app/(staff)/` | Role-protected staff tabs and clinical workflow screens. |
| `src/components/` | Shared visual controls, records, admin, and visit components. |
| `src/constants/` | Theme, clinical categories, provinces, and vital definitions. |
| `src/hooks/` | Responsive-layout utilities. |
| `src/i18n/` | Supported language definitions and translations. |
| `src/stores/` | Auth, patient, locale, and unread-message state. |
| `src/utils/` | Input, password, date, search, and South African-ID helpers. |
| `supabase/migrations/` | Versioned schema, database logic, and RLS changes. |
| `supabase/functions/` | Deno Edge Functions for privileged server actions. |
| `app.json` | Expo application configuration, mobile behaviour, plugins, and assets. |
| `eas.json` | Preview and production EAS profiles. |
| `docs/RELEASE_CHECKLIST.md` | Required production configuration and release gates. |

## 8. Run and validate locally

### Prerequisites

1. Install Node.js and npm.
2. Create a Supabase project or use an approved development project.
3. Copy `.env.example` to `.env`.
4. Set only the public values below:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=your_publishable_or_anon_key
```

### Commands

```powershell
npm install
npx expo start
```

Use `a` from the Expo terminal to open Android, `i` for iOS where available, or scan the QR code in Expo Go. If Expo Go has retained stale code, use:

```powershell
npx expo start --clear
```

Run the minimum validation gates before a change is accepted:

```powershell
npm run typecheck
npm run lint
npx expo-doctor
```

There is a focused registration helper at `scripts/register-patient-test.mjs`. There is not yet an automated end-to-end test suite; role-based acceptance testing on an Android/iOS preview build remains a release requirement.

## 9. Deployment plan

### What is already configured

- `eas.json` has a `preview` profile for internal distribution and a `production` profile with remote version auto-increment.
- `app.json` defines the app name, slug, icons, localisation plugin, Android keyboard pan mode, and native appearance settings.
- The release checklist documents required secrets and validation gates.

### What must happen before deployment

1. Create organisation-owned production Supabase and Expo/EAS projects.
2. Choose and reserve the real Android package name and iOS bundle identifier; add them to `app.json`.
3. Run `npx eas-cli@latest build:configure` while logged in to the organisation Expo account so the project receives its EAS project ID.
4. Set EAS environment variables for the public Supabase URL and publishable/anon key.
5. Apply database migrations and deploy Edge Functions to the production Supabase project.
6. Configure `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_MESSAGING_SERVICE_SID` as Supabase secrets.
7. Configure Supabase Auth production security and SMTP.
8. Complete clinical, privacy/POPIA, accessibility, and role-based acceptance review.
9. Create an internal review build, obtain release-owner approval, then create and submit production builds.

Example build commands:

```powershell
# Internal review build
npx eas-cli@latest build --profile preview --platform all

# Production build after release approval
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit --profile production --platform all
```

Do not submit a production build or share real credentials from a shared machine. The release owner must control the organisation Expo account, app-store accounts, Supabase production project, and provider secrets.

## 10. Release acceptance checklist

Before approving a preview build, verify at minimum:

- patient and staff sign-in, wrong-area rejection, sign-out, and inactive-account handling;
- patient PIN change and staff password change with current credential validation;
- patient language choice and SMS/app-notification consent persistence;
- patient dashboard, histories, and message unread/read-receipt states;
- patient registration, duplicate-ID protection, and first PIN handling;
- queue add/status flows and nurse visit recording;
- clinic isolation for patient searches, records, actions, SMS, and staff management;
- complaint resolution and aggregate-only analytics permissions;
- SMS consent, safe template selection, provider failure state, log entry, and rate limit;
- small Android phone, gesture-navigation Android, three-button Android, tablet, desktop browser, and screen-reader navigation;
- offline and retry messaging for data-loading and saving paths.

## 11. Known operational limits

- SMS delivery is unavailable until a Twilio messaging service and the required Supabase secrets are configured.
- App-notification consent is stored, but a push-notification delivery service is not yet configured in this repository.
- Deployment has not been completed; no EAS project ID, Android package name, iOS bundle identifier, store metadata, or production credentials are committed.
- Clinical use requires organisation-specific governance and safety sign-off; this codebase alone is not a production-healthcare approval.
