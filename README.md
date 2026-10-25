# SA Health+

SA Health+ is a mobile-first clinic records app for South African patients and clinic staff. It is built with Expo Router, React Native, Supabase, and Row Level Security.

## Run locally

1. Copy `.env.example` to `.env` and set the Supabase URL and publishable/anon key.
2. Install dependencies with `npm install`.
3. Start the app with `npx expo start`.

Useful checks:

```powershell
npm run lint
npm run typecheck
npx expo-doctor
```

## Core capabilities

- Separate patient, nurse, reception, clinic-admin, and super-admin experiences.
- Patient records, appointments, medication, blood-test and vital-sign views.
- Secure in-app patient/staff conversations with live unread indicators.
- Patient settings for language, SMS consent, app-notification consent, and PIN changes.
- Current-credential-verified password/PIN changes for every signed-in account.
- Consent-gated, audited clinic SMS reminders using templates that do not disclose health information.
- Aggregate-only clinic analytics for administrators.

## Backend

Database schema and access policies are in `supabase/migrations`. Privileged actions use Edge Functions in `supabase/functions`; deploy those functions only after applying the migrations. The app must never receive a service-role key or SMS-provider credential.

Read [the release checklist](docs/RELEASE_CHECKLIST.md) before configuring EAS, deploying Supabase, or submitting to the stores.
