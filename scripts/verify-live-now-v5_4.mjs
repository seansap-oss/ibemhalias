import fs from "node:fs";

const checks = [
  ["components/live-class/providers/livekit/livekit-teleclass-room.tsx", "Raised Hands"],
  ["components/live-class/providers/livekit/livekit-teleclass-room.tsx", "studio-pip"],
  ["components/live-class/providers/livekit/livekit-teleclass-room.tsx", "VIP1"],
  ["components/live-class/providers/livekit/livekit-teleclass-room.tsx", "Watermark"],
  ["components/live-class/providers/livekit/livekit-teleclass-room.tsx", "Add Camera"],
  ["components/live-class/providers/livekit/livekit-teleclass-room.tsx", "Next slide"],
  ["components/live-class/providers/livekit/livekit-teleclass-room.tsx", "1080p"],
  ["components/live-class/providers/livekit/livekit-teleclass-room.tsx", "4K"],
  ["lib/live-now/license.ts", "LIVE_NOW_LICENSE_SERVER_URL"],
  ["app/api/live-class/provider/token/route.ts", "requireLiveNowLicense"],
  ["app/api/live-now/license/status/route.ts", "verifyLiveNowLicense"],
];

for (const [file, needle] of checks) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes(needle)) {
    console.error(`FAIL ${file}: missing ${needle}`);
    process.exit(1);
  }
  console.log(`PASS ${file}: ${needle}`);
}

console.log("LIVE NOW V5.4 PRO STUDIO STATIC VERIFICATION PASSED");
