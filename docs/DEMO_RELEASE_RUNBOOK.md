# SA Health+ demonstration release runbook

**Purpose:** get a safe, working web demonstration online today, prepare a clean demo dataset, and start an Android preview APK without delaying the web presentation.

**Release status at the start of this runbook**

| Item | Status | Evidence / note |
| --- | --- | --- |
| Application code | Pushed | GitHub `main` includes commit `5247f33`. |
| System documentation | Local only | `docs/SYSTEM_DOCUMENTATION.md` and its README link have not yet been pushed. |
| Supabase schema/functions | Source-ready | 21 migration files and Edge Function source are in the repository; production application/deployment still needs verification. |
| Cloudflare Pages | Not configured | Requires a Cloudflare account and project creation. |
| Android preview APK | Not configured | Requires Expo login, EAS project linking, Android package identifier, and a queued cloud build. |
| Store release | Not in scope for today | Google Play/App Store setup is a later release phase. |

## 1. Deadline-first decision

### Recommended order

1. **Publish the web build first** with Cloudflare Pages Direct Upload. This creates the presentation URL fastest.
2. Verify patient and staff sign-in on the live URL.
3. Back up and prepare a small fictional demonstration dataset only after the release owner approves the cleanup scope.
4. Start the Android preview APK build in parallel. Do not wait for it before presenting the web URL.
5. Tag `v1.0.0` only after the live web smoke test is accepted.

### Deployment path comparison

| Option | Best for | Advantages | Trade-off | Decision for today |
| --- | --- | --- | --- | --- |
| **Cloudflare Pages Direct Upload** | An urgent, one-off demo | Uses the already-built `dist` folder; no Git provider connection or cloud build wait; drag-and-drop is available. | No automatic deploys from Git; a Direct Upload Pages project cannot later be converted to Git integration. | **Use this first.** |
| Cloudflare Pages Git integration | Ongoing automatic deployments | Every later push can build/deploy automatically; Cloudflare build variables are used by the build. | Requires connecting GitHub, selecting branch/settings, entering variables, and waiting for the first remote build. | Configure after the presentation, or create a separate Git-integrated Pages project. |

Cloudflare explicitly supports either a folder or ZIP file for drag-and-drop Direct Upload, and warns that a Direct Upload project cannot later switch to Git integration. [Cloudflare Direct Upload documentation](https://developers.cloudflare.com/pages/get-started/direct-upload/)

## 2. Critical rules before starting

- Never copy Supabase service-role keys, Twilio credentials, staff passwords, or patient data into GitHub, `eas.json`, `app.json`, Cloudflare build logs, screenshots, or this document.
- `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` are public client configuration values; they are baked into the web/Expo bundle. Database security must therefore be enforced by Supabase Auth and Row Level Security.
- The existing web configuration is `"output": "single"`. That is a single-page app, so add a redirect fallback before exporting to prevent an inner-page refresh from returning a 404.
- Do not delete Supabase data until the release owner confirms that the exports were saved and approves the cleanup SQL. Messages and complaints must be deleted before patients; Auth users must be deleted last.
- Use fictional demo patients only. Do not create or present real patient records.

## 3. Fast web deployment — Direct Upload (recommended)

### Owner prerequisites

| Needed | Why |
| --- | --- |
| Cloudflare account access | Create the Pages project and upload the static build. |
| A working `.env` file | Expo reads the two public Supabase values while it exports the web bundle. |
| Confirmed Supabase project | The web app points to this project and its demo accounts. |

### Step A — add the SPA fallback

Create `public/_redirects` with exactly:

```text
/* /index.html 200
```

This must be done **before** running the export because Expo copies `public/` files to `dist`. The current project uses Expo web `single` output, so a static host needs this SPA fallback for direct navigation to a route such as `/queue` or `/settings`.

### Step B — validate and create the static bundle

From the repository root:

```powershell
npm ci
npm run typecheck
npm run lint
npx expo export --platform web --clear
npx expo serve
```

Open the address shown by `npx expo serve`. Test the sign-in page and one patient/staff route. Stop the server after the check. The built site is in `dist/`.

Before exporting, verify only that the local values are present—do not print them to the terminal or share them:

```powershell
Test-Path .env
```

Expo replaces `EXPO_PUBLIC_*` values at export/build time. Therefore, for this Direct Upload route, the correct values must be in the local `.env` **before** the export. Adding variables to Cloudflare afterward does not change the already-uploaded JavaScript bundle. [Expo environment-variable documentation](https://docs.expo.dev/eas/environment-variables/usage/)

### Step C — create and upload to Cloudflare Pages

1. Sign in to Cloudflare.
2. Open **Workers & Pages** → **Create application** → **Pages**.
3. Choose **Direct Upload** / **Upload assets** rather than **Connect to Git**.
4. Choose a non-sensitive project name, for example `sa-health-plus-demo`.
5. Upload the **contents of `dist`** as the folder, or upload a ZIP made from the contents of `dist` (not a parent directory containing `dist`).
6. Deploy and copy the generated `https://<project>.pages.dev` URL.
7. Open that URL in a private/incognito browser window.
8. Sign in as a patient and as each staff role that is intended for the demonstration.
9. Refresh an inner route after navigation. If it returns a 404, confirm that `dist/_redirects` exists, correct `public/_redirects`, re-export, and upload a new deployment.

Cloudflare’s Direct Upload path accepts a single asset folder or ZIP via drag-and-drop; use Wrangler only if the release owner prefers command-line deployments. [Cloudflare Direct Upload documentation](https://developers.cloudflare.com/pages/get-started/direct-upload/)

### Direct Upload smoke test

| Check | Pass condition |
| --- | --- |
| Landing page | Loads over HTTPS at the `.pages.dev` URL. |
| Patient sign-in | A fictional patient can sign in and see their dashboard. |
| Staff sign-in | A prepared nurse/admin account reaches only its permitted tabs. |
| Route refresh | Browser refresh on a tab or inner route returns the app, not a 404. |
| Supabase connectivity | Lists, records, messages, and consent state load without a console/error banner. |
| Small screen | Bottom navigation remains above Android navigation/gesture controls. |

## 4. Alternative web deployment — Git integration

Use this only if continuous deployment is more valuable than the fastest possible first URL.

1. In Cloudflare, open **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
2. Authorise GitHub and select `edward-matlole-dev/sa-health-plus`, branch `main`.
3. Set the build command to:

   ```text
   npx expo export --platform web
   ```

4. Set output directory to:

   ```text
   dist
   ```

5. Add these build-time environment variables for the production branch:

   | Name | Value |
   | --- | --- |
   | `EXPO_PUBLIC_SUPABASE_URL` | Production/demo Supabase URL |
   | `EXPO_PUBLIC_SUPABASE_KEY` | Production/demo publishable or anon key |
   | `NODE_VERSION` | `22` only if the Cloudflare build log reports a Node compatibility problem |

6. Ensure `public/_redirects` is committed, then push it before the first Pages build.
7. Deploy and run the same smoke test table above.

With Git integration, Cloudflare receives the public variables while it runs `expo export`; that is why the variables must be configured in the Cloudflare build settings. Git integration is preferred for later maintenance, but it adds account-authorisation and first-build time today.

## 5. B2 — prepare a safe demonstration dataset

### Backup gate — must happen first

| Export | Minimum tables/data |
| --- | --- |
| Identity and organisations | `clinics`, `profiles`, Supabase Auth user list (admin-only export) |
| Patient records | `patients`, visits, vitals, medications, appointments, blood tests, injections |
| Operational data | `queue_entries`, `messages`, `complaints`, `sms_log`, `patient_security_events` |

Export CSV files from Supabase Table Editor, place them in a private encrypted location outside this repository, and record the project URL and export time. Do not commit CSVs.

### Cleanup gate

The cleanup SQL is intentionally not included until the release owner confirms the backup and which clinic/project is safe to clean. The intended deletion order is:

1. child/communication data: messages, complaints, queue entries, SMS logs, security events;
2. clinical children: vitals and other visit-linked records, appointments, medications, tests, injections, visits;
3. patient records and profiles;
4. Supabase Auth users last, using an administrator-only process;
5. preserve required migration history and the super-admin bootstrap path.

After cleanup, create fresh fictional accounts **through the app**:

| Account type | Quantity | Minimum demonstration purpose |
| --- | ---: | --- |
| Super admin | 1 | Clinic and organisation management. |
| Clinic admin | 1 | Staff, patient-account, complaint, and analytics flows. |
| Nurse | 2 | Dashboard, patient record, visit, messaging, SMS flow. |
| Reception | 1 | Patient registration and queue flow. |
| Fictional patients | 4–5 | Varying records for healthy, routine, overdue, and one crisis-reading scenario. |

Keep newly created passwords in a private password manager or paper note controlled by the demonstrator. Never commit them or include them in screenshots.

### Suggested fictional demo stories

| Patient | Demonstrates |
| --- | --- |
| Patient A | Routine check-up with normal readings and a future appointment. |
| Patient B | Active medication with an upcoming collection. |
| Patient C | Blood test due/overdue and a safe SMS reminder after consent. |
| Patient D | Crisis or high vital reading visible in nurse review workflow. |
| Patient E | An open complaint for the clinic-admin resolution flow. |

## 6. B3 — Supabase release checks

Run these only while authenticated to the intended Supabase project:

```powershell
npx supabase migration list
npx supabase functions delete whoami
```

Acceptance conditions:

| Check | Pass condition |
| --- | --- |
| Migration list | All 21 repository migrations are shown as applied to the target project. Stop if any differ. |
| Functions | `register-patient`, `register-staff`, `reset-patient-pin`, and `send-sms` are deployed; obsolete `whoami` is deleted only after verifying it is not used. |
| Secrets | Twilio credentials exist only in Supabase secrets, not client config. |
| Auth | Patient PIN/staff password policy and current-password verification are enabled for the target environment. |
| Free-tier readiness | Open the Supabase dashboard the day before every demonstration so an inactive free project wakes up before presenting. |

If `migration list` does not match, stop the release and investigate before touching demo data.

## 7. B6 — Android preview APK (parallel, not the web critical path)

### Required code/configuration changes

The release owner specified the Android package name:

```json
{
  "expo": {
    "android": {
      "package": "com.thinktech.sahealthplus"
    }
  }
}
```

Keep the existing Android configuration keys; add `package` inside the existing `android` object rather than replacing it.

Configure the EAS preview profile as follows, using the real public values only at build time:

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "<demo Supabase URL>",
        "EXPO_PUBLIC_SUPABASE_KEY": "<demo publishable/anon key>"
      }
    }
  }
}
```

For a durable configuration, prefer storing those public variables in the Expo project’s `preview` environment rather than putting values in `eas.json`. EAS build environments are selected by profile, and the remote builder cannot rely on the local ignored `.env` file. [Expo EAS environment documentation](https://docs.expo.dev/eas/environment-variables/usage/)

### APK commands

```powershell
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile preview
```

EAS preview builds are intended for internal testing, and setting `android.buildType` to `apk` creates an installable Android package rather than the Play-Store-oriented AAB format. [Expo APK build documentation](https://docs.expo.dev/build-reference/apk/)

After the build completes, download the APK, install it on a test Android phone (allow installation from the download source if prompted), and repeat the smoke test. Start this build as early as possible because free EAS queues are outside the team’s control.

## 8. B7 — release record and tag

Do this only after the web URL has passed the smoke test and the release owner accepts the result:

```powershell
git add README.md docs/SYSTEM_DOCUMENTATION.md docs/DEMO_RELEASE_RUNBOOK.md public/_redirects
git commit -m "docs: add demonstration release runbook"
git push origin main
git tag -a v1.0.0 -m "SA Health+ demonstration release"
git push origin v1.0.0
```

### Final release checklist

| Section | Owner | Done when |
| --- | --- | --- |
| Source | Release owner | `main` is pushed and documentation/release configuration are committed. |
| Data | Release owner | Private backup complete; only fictional demo data remains; private account note exists. |
| Supabase | Backend owner | All migrations/functions match the target; secrets and auth policies verified. |
| Web | Demonstrator | `.pages.dev` URL works, sign-in works, and refresh fallback works. |
| Android | Demonstrator | APK installed and smoke-tested, or the explicit Expo Go/web fallback is ready. |
| Presentation | Demonstrator | Login roles, demo stories, live URL, and fallback link are prepared. |
| Version | Release owner | `v1.0.0` tag pushed after approval. |

## 9. Presentation fallback plan

If a Cloudflare or EAS action fails near the deadline:

1. Present the deployed Cloudflare web URL if it is working.
2. If Cloudflare is unavailable, use Expo Go with `npx expo start --clear` and the existing demo Supabase project.
3. If native build is queued, demonstrate the web URL on the phone browser and state that the internal APK build is pending provider queue time.
4. Do not improvise destructive database cleanup or expose credentials to recover time.

## 10. Release document outline for submission

Use the following headings in the final lecturer/supervisor release document:

1. **Release identification** — project name, version/tag, date, owner, commit hash.
2. **Purpose and scope** — what the demonstration covers and what is not being released to app stores.
3. **Live endpoints** — Cloudflare `.pages.dev` URL, Supabase project name (not secrets), and APK build link if available.
4. **System overview** — short summary with a link to `SYSTEM_DOCUMENTATION.md`.
5. **Roles and fictional demonstration accounts** — role names and scenarios only; no passwords.
6. **Deployment architecture** — Expo web bundle → Cloudflare Pages; mobile preview → EAS; data/auth → Supabase; SMS → Twilio Edge Function.
7. **Database and function release evidence** — migration list result, deployed functions, backup confirmation, and demo-data declaration.
8. **Test evidence** — role-based smoke-test table, device/browser used, date, pass/fail, and issues.
9. **Security and privacy controls** — role separation, RLS, consent-gated SMS, no sensitive SMS content, credential handling, fictional data.
10. **Known limitations and next phase** — no store release, EAS queue risk, push delivery not configured, governance work required for real clinical use.
11. **Sign-off** — demonstrator, supervisor/lecturer, date, and approval decision.
