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

final result: blocked
