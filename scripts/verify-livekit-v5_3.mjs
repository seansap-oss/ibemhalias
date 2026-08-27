import fs from 'node:fs';

const checks = [
  ['components/live-class/live-teleclass-room.tsx', 'LiveKit OSS', 'multi-provider teacher selector'],
  ['components/live-class/live-teleclass-room.tsx', 'HmsTeleclassRoom', '100ms preserved'],
  ['components/live-class/providers/livekit/livekit-teleclass-room.tsx', 'livekit-client', 'LiveKit client'],
  ['components/live-class/providers/livekit/livekit-teleclass-room.tsx', 'Raise hand', 'raise-hand UI'],
  ['components/live-class/providers/livekit/livekit-teleclass-room.tsx', 'promote', 'speaker promotion'],
  ['components/live-class/providers/livekit/livekit-teleclass-room.tsx', 'setScreenShareEnabled', 'screen share'],
  ['components/live-class/providers/livekit/livekit-teleclass-room.tsx', 'presentStoredPdf', 'stored PDF presentation'],
  ['components/live-class/providers/livekit/livekit-teleclass-room.tsx', 'persistSelectedPdf', 'teacher PDF persistence'],
  ['components/live-class/providers/livekit/livekit-teleclass-room.tsx', 'CommunityChat', 'persistent live-class chat'],
  ['components/live-class/providers/livekit/livekit-teleclass-room.tsx', '/api/live-class/student', 'attendance integration'],
  ['components/live-class/providers/livekit/livekit-teleclass-room.tsx', '/api/live-class/lighting', 'lighting hook'],
  ['app/api/live-class/provider/token/route.ts', 'ACCESS_DENIED', 'server assignment validation'],
  ['app/api/live-class/provider/token/route.ts', 'verifyAdminSessionToken', 'server teacher validation'],
  ['app/api/live-class/provider/moderate/route.ts', 'updateParticipant', 'teacher moderation API'],
  ['lib/live-class/providers/livekit.ts', 'LIVEKIT_API_SECRET', 'server-only LiveKit secret'],
  ['lib/live-class/providers/100ms.ts', 'createHmsAppToken', '100ms provider adapter'],
  ['app/api/live-class/provider/route.ts', 'saveProviderRoom(client, currentProvider', 'current provider room preservation'],
  ['app/api/live-class/provider/route.ts', 'loadProviderRoom(client, provider', 'target provider room restoration'],
  ['app/api/live-class/provider/route.ts', 'return `provider_room:${provider}:${classId}`', 'provider-specific room storage key'],
  ['app/globals.css', 'IBEMHAL V5.3 LIVEKIT CLASSROOM', 'scoped LiveKit styles'],
  ['lib/site-version.ts', 'Website Version 5.3', 'V5.3 version label'],
];

let failed = 0;
console.log('\n=== V5.3 STATIC FEATURE VERIFICATION ===');
for (const [file, needle, label] of checks) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes(needle)) {
    console.error(`  FAIL: ${label} (${file})`);
    failed++;
  } else {
    console.log(`  PASS: ${label}`);
  }
}

const forbidden = [
  ['components/live-class/providers/livekit/livekit-teleclass-room.tsx', 'teacherPin', 'standalone teacher PIN removed'],
  ['components/live-class/providers/livekit/livekit-teleclass-room.tsx', "fetch('/api/token'", 'standalone token API removed'],
  ['components/live-class/providers/livekit/livekit-teleclass-room.tsx', "fetch('/api/moderate'", 'standalone moderation API removed'],
];
for (const [file, needle, label] of forbidden) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes(needle)) {
    console.error(`  FAIL: ${label}`);
    failed++;
  } else {
    console.log(`  PASS: ${label}`);
  }
}

if (failed) {
  console.error(`\nV5.3 verification failed: ${failed} check(s).`);
  process.exit(1);
}
console.log('\nV5.3 static verification passed.');
