export type LiveNowPlan = 'owner' | 'starter' | 'pro' | 'ultra';
export type LiveNowResolution = '720p' | '1080p' | '4k';

export type LiveNowEntitlements = {
  active: boolean;
  plan: LiveNowPlan;
  maxResolution: LiveNowResolution;
  maxParticipants: number;
  features: {
    pip: boolean;
    vip: boolean;
    multiCamera: boolean;
    pdf: boolean;
    whiteboard: boolean;
    recording: boolean;
    watermark: boolean;
    networkCheck: boolean;
  };
  expiresAt?: string | null;
  source: 'owner' | 'remote' | 'development';
};

const OWNER: LiveNowEntitlements = {
  active: true,
  plan: 'owner',
  maxResolution: '4k',
  maxParticipants: 3000,
  source: 'owner',
  features: {
    pip: true,
    vip: true,
    multiCamera: true,
    pdf: true,
    whiteboard: true,
    recording: true,
    watermark: true,
    networkCheck: true,
  },
};

const DEVELOPMENT: LiveNowEntitlements = {
  ...OWNER,
  plan: 'owner',
  source: 'development',
};

function normalizeRemote(payload: any): LiveNowEntitlements {
  const plan = ['starter', 'pro', 'ultra', 'owner'].includes(String(payload?.plan))
    ? payload.plan
    : 'starter';
  const maxResolution = ['720p', '1080p', '4k'].includes(String(payload?.maxResolution))
    ? payload.maxResolution
    : '720p';

  return {
    active: Boolean(payload?.active),
    plan,
    maxResolution,
    maxParticipants: Math.max(1, Number(payload?.maxParticipants || 100)),
    expiresAt: payload?.expiresAt || null,
    source: 'remote',
    features: {
      pip: Boolean(payload?.features?.pip),
      vip: Boolean(payload?.features?.vip),
      multiCamera: Boolean(payload?.features?.multiCamera),
      pdf: payload?.features?.pdf !== false,
      whiteboard: Boolean(payload?.features?.whiteboard),
      recording: Boolean(payload?.features?.recording),
      watermark: Boolean(payload?.features?.watermark),
      networkCheck: payload?.features?.networkCheck !== false,
    },
  };
}

export async function verifyLiveNowLicense(input?: {
  classId?: string;
  origin?: string;
}): Promise<LiveNowEntitlements> {
  const mode = String(process.env.LIVE_NOW_LICENSE_MODE || '').trim().toLowerCase();

  if (mode === 'owner') return OWNER;
  if (!mode && process.env.NODE_ENV !== 'production') return DEVELOPMENT;

  const serverUrl = String(process.env.LIVE_NOW_LICENSE_SERVER_URL || '').trim().replace(/\/$/, '');
  const licenseKey = String(process.env.LIVE_NOW_LICENSE_KEY || '').trim();
  const customerId = String(process.env.LIVE_NOW_CUSTOMER_ID || '').trim();

  if (!serverUrl || !licenseKey || !customerId) {
    return {
      ...normalizeRemote({ active: false }),
      active: false,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(`${serverUrl}/v1/licenses/verify`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${licenseKey}`,
      },
      body: JSON.stringify({
        customerId,
        product: 'live-now',
        classId: input?.classId || null,
        origin: input?.origin || null,
      }),
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) return { ...normalizeRemote({ active: false }), active: false };
    return normalizeRemote(await response.json());
  } catch {
    return { ...normalizeRemote({ active: false }), active: false };
  } finally {
    clearTimeout(timer);
  }
}

export async function requireLiveNowLicense(input?: {
  classId?: string;
  origin?: string;
}) {
  const license = await verifyLiveNowLicense(input);
  if (!license.active) {
    throw Object.assign(
      new Error('Live Now license is inactive. Please contact your Live Now provider.'),
      { status: 402 }
    );
  }
  return license;
}
