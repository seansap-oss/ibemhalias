import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "app/(dynamic)/live-classes/page.tsx",
  "app/(dynamic)/live-classes/[sessionId]/page.tsx",
  "app/(dynamic)/admin/live-classes/layout.tsx",
  "app/(dynamic)/admin/live-classes/page.tsx",
  "app/(dynamic)/admin/live-classes/schedule/page.tsx",
  "app/(dynamic)/admin/live-classes/students/page.tsx",
  "app/(dynamic)/admin/live-classes/students/[studentId]/page.tsx",
  "app/(dynamic)/admin/live-classes/classrooms/page.tsx",
  "app/(dynamic)/admin/live-classes/reminders/page.tsx",
  "app/(dynamic)/admin/live-classes/attendance/page.tsx",
  "app/(dynamic)/admin/live-classes/packages/page.tsx",
  "app/(dynamic)/admin/live-classes/classes/[classId]/page.tsx",
  "app/api/live-class/admin/route.ts",
  "app/api/live-class/admin/upload/route.ts",
  "app/api/live-class/student/route.ts",
  "app/api/live-class/reminders/process/route.ts",
  "supabase/migrations/006_live_class_management.sql",
];
let failed = false;
for (const rel of required) {
  const ok = fs.existsSync(path.join(root, rel));
  console.log(`${ok ? "PASS" : "FAIL"} route/file ${rel}`);
  if (!ok) failed = true;
}
const ui = fs.readFileSync(path.join(root, "components/live-class/live-admin-console.tsx"), "utf8");
const api = fs.readFileSync(path.join(root, "app/api/live-class/admin/route.ts"), "utf8");
const actions = [...ui.matchAll(/postAdmin\("([a-z_]+)"/g)].map((m) => m[1]);
for (const action of [...new Set(actions)]) {
  const ok = api.includes(`action === "${action}"`);
  console.log(`${ok ? "PASS" : "FAIL"} admin action ${action}`);
  if (!ok) failed = true;
}

const expectedActions = [
  "create_class","update_class","create_student","update_student","assign_classes","revoke_class",
  "grant_package","revoke_package","create_room","auto_assign_rooms","save_reminder_rule",
  "save_automation","send_test","send_reminder_now","sync_assignments","map_package_classes","mark_attendance"
];
for (const action of expectedActions) {
  const ok = api.includes(`action === "${action}"`);
  console.log(`${ok ? "PASS" : "FAIL"} expected action ${action}`);
  if (!ok) failed = true;
}

const adminLayout = fs.readFileSync(path.join(root, "app/(dynamic)/admin/layout.tsx"), "utf8");
if (!adminLayout.includes('/admin/live-classes')) { console.log("FAIL global admin navigation"); failed = true; } else console.log("PASS global admin navigation");
if (adminLayout.includes('isLogin') && adminLayout.includes('return <>{children}</>')) console.log("PASS admin login bypass"); else { console.log("FAIL admin login bypass"); failed = true; }
if (failed) process.exit(1);
console.log("\nLIVE CLASS ROUTE/ACTION VERIFICATION PASSED");
