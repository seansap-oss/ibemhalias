import fs from "node:fs";

const checks = [
  ["LiveKit auto retry", "components/live-class/providers/livekit/livekit-teleclass-room.tsx", "Automatic retry"],
  ["LiveKit network quality", "components/live-class/providers/livekit/livekit-teleclass-room.tsx", "ConnectionQualityChanged"],
  ["LiveKit offline recovery", "components/live-class/providers/livekit/livekit-teleclass-room.tsx", "Network restored"],
  ["Participant network dot", "components/live-class/providers/livekit/livekit-teleclass-room.tsx", "participant-network"],
  ["Admin Network Check nav", "components/admin/premium-admin-shell.tsx", "/admin/network-check"],
  ["Network Check page", "app/(dynamic)/admin/network-check/page.tsx", "Run Network Test"],
  ["Network ping endpoint", "app/api/network-check/ping/route.ts", "pong"],
  ["Network download endpoint", "app/api/network-check/download/route.ts", "randomBytes"],
  ["Network upload endpoint", "app/api/network-check/upload/route.ts", "receivedBytes"],
  ["Version 5.3.6", "lib/site-version.ts", "5.3.6"],
];

let failed = 0;
for (const [label, file, needle] of checks) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes(needle)) {
    console.error(`FAIL ${label}`);
    failed += 1;
  } else {
    console.log(`PASS ${label}`);
  }
}
if (failed) process.exit(1);
console.log(`PASS ${checks.length}/${checks.length} V5.3.6 checks`);
