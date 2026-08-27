import fs from 'node:fs';

const checks = [
  ['components/live-class/live-teleclass-room.tsx', 'Live Now', 'Live Now label'],
  ['components/live-class/live-teleclass-room.tsx', 'LiveKitTeleclassRoom', 'LiveKit classroom renderer'],
  ['components/live-class/providers/livekit/livekit-teleclass-room.tsx', 'Ibemhal IAS Live Now', 'Live Now classroom branding'],
  ['components/live-class/providers/livekit/livekit-teleclass-room.tsx', 'LIVE NOW •', 'Live Now eyebrow'],
  ['lib/live-class/providers/livekit.ts', 'LIVEKIT_URL is invalid', 'clear invalid URL error'],
  ['lib/live-class/providers/livekit.ts', 'ws://192.168.1.20:7880', 'LAN URL guidance'],
  ['app/api/live-class/provider/token/route.ts', 'createLiveKitJoinToken', 'LiveKit-only token creation'],
  ['app/api/live-class/provider/token/route.ts', 'provider: "livekit"', 'LiveKit token response/config'],
  ['app/api/live-class/provider/route.ts', 'legacy live provider is temporarily disabled', 'legacy provider hidden server guard'],
  ['app/api/live-class/provider/route.ts', 'ensureLiveKitRoom', 'automatic LiveKit room provisioning'],
  ['app/api/live-class/student/route.ts', 'provider: "livekit"', 'student LiveKit-only provider'],
  ['app/api/live-class/provider/moderate/route.ts', 'RoomServiceClient', 'LiveKit moderation'],
  ['lib/site-version.ts', '5.3.1', 'V5.3.1 version label'],
];

let failures = 0;
for (const [file, needle, label] of checks) {
  const source = fs.readFileSync(file, 'utf8');
  if (!source.includes(needle)) {
    console.error(`FAIL: ${label} -> ${file}`);
    failures += 1;
  } else {
    console.log(`PASS: ${label}`);
  }
}

const shell = fs.readFileSync('components/live-class/live-teleclass-room.tsx', 'utf8');
if (/100ms|HmsTeleclassRoom|switchProvider/i.test(shell)) {
  console.error('FAIL: visible classroom shell still exposes 100ms/provider switching');
  failures += 1;
} else {
  console.log('PASS: 100ms hidden from visible classroom shell');
}

if (failures) {
  console.error(`\nLIVE NOW V5.3.1 VERIFICATION FAILED: ${failures} issue(s)`);
  process.exit(1);
}

console.log('\nLIVE NOW V5.3.1 STATIC VERIFICATION PASSED');
