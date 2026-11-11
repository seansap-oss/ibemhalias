**Source visual truth**

- Local concept board: `D:\LMS IAS WEBSITE\.codex-preview\ibemhal-staff-portal-concepts.html`.
- Target state: desktop teacher workspace in Classic white and Ibemhal navy, with material upload and backup status prominent.

**Implementation evidence**

- Route: `/teacher/materials`.
- Build evidence: `npm.cmd run build` completed successfully on 2026-10-26.
- Browser-rendered authenticated teacher screenshot: unavailable. This environment does not have a teacher session or test credentials, and the workspace is intentionally protected behind staff authentication.
- Target viewport: desktop web application. Pixel comparison is blocked because the authenticated route cannot be safely captured.

**Findings**

- [P2] Authenticated visual capture is still required.
  Location: `/teacher/materials`.
  Evidence: the source concept contains the teacher-only workspace; the implementation is access-controlled and could not be rendered without a teacher account.
  Impact: final pixel-level comparison of typography, spacing, colour tokens, image/icon treatment and copy cannot be completed before release.
  Fix: sign in as a teacher after deployment and compare the workspace against the approved concept board at a desktop viewport.

**Required fidelity surfaces**

- Fonts and typography: implemented with the existing project sans-serif hierarchy; browser comparison pending.
- Spacing and layout rhythm: implemented as a responsive two-column desktop workspace with stacked mobile layout; browser comparison pending.
- Colors and visual tokens: Classic white, Ibemhal navy, restrained indigo, and semantic backup states; browser comparison pending.
- Image quality and asset fidelity: no custom raster imagery is part of this workspace; existing Ibemhal brand asset and Lucide UI icons are used.
- Copy and content: teacher material upload, Drive assignment, Local Data Vault, and admin oversight copy is implemented.

**Implementation checklist**

1. Confirm the teacher can sign in through `/admin/login` and lands on `/teacher/dashboard`.
2. Assign a Drive folder under Admin → Teachers → Workspace & Drive.
3. Upload a small course document under Teacher → Study Material and verify the ledger row.
4. Connect institute Google Drive credentials before enabling the Drive mirror toggle.

**Follow-up polish**

- Add a post-Drive-connection job that mirrors `ready_to_sync` materials and updates the file-level Drive status.

## Zoom webinar classroom update — 12 November 2026

**Source visual truth**

- Approved concept: the white-and-navy student webinar view shown in this chat, with the lecture canvas, attendance state, Raise Hand and Q&A controls.

**Implemented surfaces**

- Student Zoom room: embedded Zoom client with Ibemhal Q&A, hand raise and LMS attendance heartbeat.
- Teacher Zoom room: a moderated Teaching Desk for questions and raised hands, plus a backup host link.
- Data safeguards: class-assignment checks occur server-side; direct Data API access to questions and hand raises is explicitly denied.

**Verification**

- `npm.cmd run build` passes on 12 November 2026; only unrelated pre-existing lint warnings remain.
- Production release `dpl_Cj34wrnK8v3xfeeVemTHgH13njiT` is Ready and the public homepage was browser-verified in Classic white.
- The protected Zoom room cannot be rendered end-to-end until an assigned student/teacher account and Zoom Webinar credentials are configured. No substitute screenshot is claimed.

**Remaining acceptance check**

1. Add the licensed Zoom host and production credentials.
2. Create one assigned teacher and student test account.
3. Start a webinar, raise a hand, submit a question, answer it as teacher, and confirm attendance watch time.

final result: blocked — awaiting licensed Zoom credentials and an authenticated rehearsal.
