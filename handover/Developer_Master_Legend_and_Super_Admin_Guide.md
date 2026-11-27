# Ibemhal IAS — Developer & Owner Master Legend (CONFIDENTIAL)

> **CONFIDENTIAL — FOR DEVELOPER / SUPER ADMIN USE ONLY**  
> Keep this file private on your hard drive. Do **NOT** share the Super Admin trigger (`©` 5s hold), Super Admin password, or API keys with client staff.

---

## 1. MASTER ACCESS & PASSWORD LEGEND

### Live URLs & Repositories

| Resource | URL / Path | Branch / Purpose |
| :--- | :--- | :--- |
| **Main LMS (Active Preview)** | `https://ibemhal-ias-lms-preview.vercel.app` | Primary updated LMS + Website + ERP |
| **Separate AI Exam Portal** | `https://ibemhaliasexamportal-3p41.vercel.app` | CBT MCQs + AI MCQ Maker + AI Essay Grading (linked by SSO) |
| **Original Production (`main`)** | `https://avitsolutionslms.online` | Untouched production snapshot (`v5.8.0-backup`) |
| **Primary GitHub Repo** | `https://github.com/seansap-oss/ibemhalias.git` | Active branch: `v5.9.0-exam-maker-unified-login` |
| **Exam Portal GitHub Repo** | `https://github.com/seansap-oss/ibemhaliasexamportal.git` | Branch: `main` |
| **Cold Backup GitHub Repo** | `https://github.com/seansap-oss/backupibemhalias.git` | Offline/emergency code backup + tags (`v5.8.0-backup`, `v5.9.0-before-vision-redesign`) |

### Credentials & Sign-In Matrix

| Role | Entry Point | Email / Username | Password | Sees |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin (Owner / Dev)** | Footer **`©`** silent **5-sec long press** → `/owner/login` | *(Password only)* | `admin@1357` | **Everything**: Owner Billing, 2% ERP Invoices, Director Creation, **Full Director View**, **Full Admin Workspace**, **All Platform Logins** |
| **Director (Client Top Boss)** | Portal Login (`/login`) | `director@ibemhalias.com` | `director@IAS123` | Director Dashboard, Admin Creator (`Admin 1..10`), Per-Admin Scorecard, Audit Log, Idle Settings, Combined ERP |
| **Director (Alternate)** | Portal Login (`/login`) | `bobocha@ibhemhalias.com` | *(Set in Supabase / reset in `/owner/dashboard`)* | Same Director Dashboard |
| **Staff Admin (Test Account)** | Portal Login (`/login`) | `testadmin@avitsolutionslms.online` *(or create `admin1@...`)* | *(Configured in `/owner/dashboard` or `/director/dashboard`)* | Courses, Landing Studio (`/admin/content`), Finance/UPI Verify, AI Exam Maker |
| **Student (Test Account)** | Portal Login (`/login`) | *(Create in Admin or test checkout)* | *(Hint on `/login`: `Student@1357` for demo student)* | Student Dashboard, Kindle PDF Reader + Watermark, Exam Portal SSO |

---

## 2. How Super Admin Controls Everything

1. **Silent Entry Trigger (`©`):**
   - Located in [owner-entry.tsx](file:///d:/LMS%20IAS%20WEBSITE/components/admin/owner-entry.tsx) inside the website footer.
   - Pressing & holding `©` for **5 seconds** gives **zero visual feedback** and opens `/owner/login`.
   - Password `admin@1357` is verified against `AVIT_OWNER_PASSWORD_HASH` (scrypt) in Vercel Preview (`lib/super-admin.ts`).
2. **Full Parity Across Owner + Director + Admin Views:**
   - Signing in at `/owner/login` automatically grants BOTH `avit_owner_session` AND `avit_admin` (`owner:avit-solutions`) session cookies, and `requireCmsAdmin()` + `canViewDirector()` + `canAccessErp()` all honor `hasOwnerSession()`.
   - From `/owner/dashboard`, Super Admin has 1-click access to:
     - **Open Admin Workspace** (`/admin/dashboard`, `/admin/content`, `/admin/finance`, `/admin/finance/payments`)
     - **Open Director's View** (`/director/dashboard`)
     - **All Platform Logins & Activity** (`/owner/activity` — Students, Teachers, Admins, Directors, Super Admin)
     - **ERP Finance, Tax & Expenses** (`/admin/finance`) + **Fee Receipts** (`/owner/fees`)
3. **2% ERP Maintenance & Payment Gateway Fee Invoicing:**
   - Configured under **Payment settings** on `/owner/dashboard` (`fee_bps = 200` → `2.00% incl. GST`, plus Owner UPI ID & QR).
   - Connected live to `/api/erp/summary` so both **Super Admin** and **Director** see the 2% fee across Daily / Weekly / Monthly / Yearly periods.
   - Super Admin uses **Send 2.00% Invoice** directly on `/owner/dashboard` to bill the institute Weekly/Monthly/Daily/Yearly, and marks invoices Paid once the Director submits the UPI reference.

---

## 3. Environment Variables Reference (Vercel)

### Main LMS (`ibemhal-ias-lms` — Preview / Production)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `AVIT_OWNER_PASSWORD_HASH` (scrypt hash for `admin@1357`), `AVIT_OWNER_SESSION_SECRET`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` (also shared for Exam Portal SSO!)
- **Optional for Auto-Emails:** `RESEND_API_KEY`, `RECEIPT_FROM_EMAIL`
- **Optional for Zoom Live Classes:** `NEXT_PUBLIC_LIVE_NOW_PROVIDER=zoom`, `ZOOM_LIVE_MODE=meeting` (free Zoom) or `webinar` (paid), `ZOOM_ACCOUNT_ID`, `ZOOM_API_CLIENT_ID`, `ZOOM_API_CLIENT_SECRET`, `ZOOM_MEETING_SDK_CLIENT_ID`, `ZOOM_MEETING_SDK_CLIENT_SECRET`, `ZOOM_HOST_EMAIL`

### Separate Exam Portal (`ibemhaliasexamportal-3p41`)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_SESSION_SECRET` (must match Main LMS for 1-click SSO!)
- **AI MCQ Maker & Essay Grading:** `GEMINI_API_KEY` *(free at `aistudio.google.com`)* and/or `GROK_API_KEY` (`console.x.ai`), optional `OPENAI_API_KEY`

---

## 4. Mobile App Builds (Android APK & Mac Xcode iOS)

1. **Android APK (Windows or Mac):**
   - Config in `capacitor.config.json` (`com.ibemhal.ias.lms`), `server.url` set to your live site URL + Android `FLAG_SECURE` screen-capture protection via `scripts/configure-security.mjs`.
   - Build command: `npm run build:apk` → outputs `android/app/build/outputs/apk/debug/app-debug.apk`.
2. **iOS App (MacBook M5 Pro + Xcode):**
   ```bash
   git clone -b v5.9.0-exam-maker-unified-login https://github.com/seansap-oss/ibemhalias.git
   cd ibemhalias
   npm install
   npm install @capacitor/ios
   npx cap add ios
   npx cap sync ios
   npx cap open ios
   ```
   - Test free in Xcode iOS Simulators or via USB on iPhone; use an Apple Developer account (\$99/year) to archive & upload to **TestFlight / App Store**.
