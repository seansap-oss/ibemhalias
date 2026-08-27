import { NextRequest, NextResponse } from 'next/server';
import { verifyLiveNowLicense } from '@/lib/live-now/license';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const classId = String(request.nextUrl.searchParams.get('classId') || '').trim();
  const license = await verifyLiveNowLicense({
    classId: classId || undefined,
    origin: request.nextUrl.origin,
  });
  return NextResponse.json({ ok: license.active, license }, { status: license.active ? 200 : 402 });
}
