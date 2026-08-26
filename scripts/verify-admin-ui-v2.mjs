import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "app/(dynamic)/admin/layout.tsx",
  "app/(dynamic)/admin/dashboard/page.tsx",
  "app/(dynamic)/admin/mock-test/page.tsx",
  "app/(dynamic)/admin/mentorship/page.tsx",
  "app/(dynamic)/admin/student-space/page.tsx",
  "app/(dynamic)/admin/notifications/page.tsx",
  "app/(dynamic)/admin/helpdesk/page.tsx",
  "app/(dynamic)/admin/profile/page.tsx",
  "app/(dynamic)/admin/banner/page.tsx",
  "components/admin/premium-admin-shell.tsx",
  "components/admin/premium-admin-dashboard.tsx",
  "components/admin/admin-tool-panels.tsx",
  "lib/site-contact.ts",
];

let failed = false;
for (const rel of requiredFiles) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error(`MISSING FILE: ${rel}`);
    failed = true;
  }
}

const shell = fs.readFileSync(path.join(root, "components/admin/premium-admin-shell.tsx"), "utf8");
const dashboard = fs.readFileSync(path.join(root, "components/admin/premium-admin-dashboard.tsx"), "utf8");
const tools = fs.readFileSync(path.join(root, "components/admin/admin-tool-panels.tsx"), "utf8");
const contact = fs.readFileSync(path.join(root, "lib/site-contact.ts"), "utf8");

const requiredShellTexts = [
  "Horizontal",
  "Vertical",
  "Floating",
  "/admin/dashboard",
  "/admin/content",
  "/admin/courses",
  "/admin/live-classes",
  "/admin/live-classes/students",
  "/admin/mentorship",
  "/admin/ingest",
  "/admin/ai-health",
  "/admin/notifications",
  "Manage Banner shown in Hero page",
  "Help Desk Mail",
  "Created and designed by AviT-Solutions.",
];

for (const text of requiredShellTexts) {
  if (!shell.includes(text)) {
    console.error(`SHELL CHECK FAILED: ${text}`);
    failed = true;
  }
}

const quickRoutes = [
  "/admin/live-classes/students",
  "/admin/content",
  "/admin/mock-test",
  "/admin/live-classes/schedule",
  "/admin/notifications",
  "/admin/mentorship",
];
for (const href of quickRoutes) {
  if (!dashboard.includes(href)) {
    console.error(`DASHBOARD LINK MISSING: ${href}`);
    failed = true;
  }
}

for (const text of ["NotificationAdminPanel", "HelpDeskAdminPanel", "AdminProfilePanel", "MockTestAdminPanel", "MentorshipAdminPanel", "StudentSpaceAdminPanel"]) {
  if (!tools.includes(text)) {
    console.error(`TOOL PANEL MISSING: ${text}`);
    failed = true;
  }
}

for (const text of ["ibemhaliashelpdesk@gmail.com", "+91 76290 49230", "917629049230"]) {
  if (!contact.includes(text)) {
    console.error(`CONTACT CHECK FAILED: ${text}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("ADMIN UI V2 ROUTE/ACTION VERIFICATION PASSED");
