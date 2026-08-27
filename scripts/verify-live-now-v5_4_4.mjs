import fs from "node:fs";

const component = fs.readFileSync("components/live-class/providers/livekit/livekit-teleclass-room.tsx", "utf8");
const css = fs.readFileSync("app/globals.css", "utf8");
const adminShell = fs.readFileSync("components/admin/premium-admin-shell.tsx", "utf8");

const checks = [
  ["V5.4.3 raised-hand typing fix preserved", component.includes('handNotification(String(participantInfo.identity || "Student"));')],
  ["V5.4.3 PIP narrowing fix preserved", component.includes("const pipCamera = studio.pip.kind === 'camera' ? studio.pip.camera : null;")],
  ["Lucide SVG controls enabled", component.includes("from 'lucide-react';") && component.includes("<Mic size={17} />")],
  ["No non-ASCII glyphs remain in Live Now TSX", !/[^\x00-\x7F]/.test(component)],
  ["Responsive compact header tools present", component.includes('className="compact-header-tools"')],
  ["Responsive People/Chat drawer present", component.includes('className="side-panel-scrim"') && component.includes('className="side-panel-close"')],
  ["People/Chat compact control present", component.includes("People / Chat")],
  ["Responsive desktop/tablet breakpoint present", css.includes("@media (max-width: 1180px)")],
  ["Compact studio menu CSS present", css.includes(".ib-livekit .compact-tools-menu")],
  ["Side tabs use overflow-safe flex layout", css.includes(".ib-livekit .side-tabs") && css.includes("overflow-x: auto")],
  ["Embedded studio no longer forced to full viewport", css.includes("height: min(920px, calc(100dvh - 148px));")],
  ["Mobile side panel becomes viewport drawer", css.includes(".ib-livekit .side-panel {\n    inset: 8px;")],
  ["Sticky compact control dock present", css.includes("position: sticky;")],
  ["Admin horizontal navigation switches to drawer below XL", adminShell.includes('viewMode === "horizontal" ? "hidden xl:block" : "hidden"')],
  ["Admin floating menu stays available below XL", adminShell.includes("xl:hidden") && adminShell.includes("Open admin navigation")],
  ["Network Check navigation preserved", adminShell.includes('label: "Network Check"')],
];

let failed = 0;
for (const [label, ok] of checks) {
  if (ok) console.log(`PASS ${label}`);
  else {
    failed += 1;
    console.error(`FAIL ${label}`);
  }
}

if (failed) process.exit(1);
console.log(`V5.4.4 responsive Live Now verification passed (${checks.length}/${checks.length}).`);
