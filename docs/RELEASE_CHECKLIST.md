# Release checklist

## Before first production build

1. Create production Supabase and Expo projects owned by the clinic organisation.
2. Set `EXPO_PUBLIC_SUPABASE_URL` and the **publishable/anon** key in the EAS environment. Never put a Supabase service-role key or SMS credential in the mobile app.
3. Apply the database migrations with `npx supabase db push`, then deploy all Edge Functions with `npx supabase functions deploy`.
4. Set the SMS provider secrets in Supabase (not in a file committed to Git): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_MESSAGING_SERVICE_SID`.
5. In Supabase Auth, require the current password for password changes, set strong password rules for staff accounts, enable leaked-password protection where available, and configure a production SMTP provider.
6. Choose the real Android application ID and iOS bundle identifier, add them to `app.json`, then run `npx eas-cli@latest build:configure` while signed in to the organisation's Expo account. This creates the linked EAS project ID and store-submission configuration.
7. Complete the privacy policy, POPIA assessment, clinical safety review, consent wording, app-store metadata, support URL, and data-retention policy before collecting real patient data.
8. Build a fresh development or preview client after this release: the localization config plugin declares the five supported app languages in the native app.

## Validation gates

Run these before every release:

```powershell
npm run lint
npm run typecheck
npx expo-doctor
npx supabase db push --dry-run
```

For a review build, use:

```powershell
npx eas-cli@latest build --profile preview --platform all
```

Run role-based acceptance checks on the review build: patient login and PIN change, consent controls, message read receipts, nurse records and SMS consent enforcement, clinic-admin analytics, offline/retry states, and Android/iOS screen-reader navigation.

When the release owner has approved the review build, build and submit using:

```powershell
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit --profile production --platform all
```

Do not run a production submission from a shared machine without the release owner's approval.
