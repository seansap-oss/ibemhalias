'use client';

import {
  ConnectionQuality,
  ConnectionState,
  Participant,
  Room,
  RoomEvent,
  Track,
  VideoPresets,
  createLocalVideoTrack,
  supportsAV1,
  supportsVP9,
} from 'livekit-client';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Circle,
  FileText,
  Hand,
  LayoutGrid,
  Maximize2,
  Menu,
  Mic,
  MoreHorizontal,
  PenTool,
  PictureInPicture2,
  Plus,
  RotateCw,
  ScreenShare,
  Settings,
  Type,
  Trash2,
  Video,
  Image as ImageIcon,
  Music,
  Film,
  Download,
  X,
} from 'lucide-react';
import { PdfDeck } from '@/components/live-class/providers/livekit/pdf-deck';
import { RemoteAudio, VideoTile } from '@/components/live-class/providers/livekit/video-tile';
import { Whiteboard } from '@/components/live-class/providers/livekit/whiteboard';
import { CommunityChat } from '@/components/chat/community-chat';
import { IbemhalLogo } from '@/components/brand/ibemhal-logo';
import { createClient } from '@/lib/supabase/client';
import type {
  ClassroomSnapshot,
  ControlMessage,
  PollState,
  CameraSourceRef,
  PipPosition,
  PipSource,
  PresentationMode,
  PresentedResource,
  QualityTier,
  StudioConfig,
  StudioLayout,
  Stroke,
  UserRole,
} from '@/lib/live-class/providers/livekit-types';

type AttendanceEntry = {
  name: string;
  firstJoin: number;
  activeSince: number | null;
  totalMs: number;
};

type PdfPayload = { bytes: Uint8Array; name: string; mimeType: string };

type TokenResponse = {
  ok?: boolean;
  provider?: "livekit" | "100ms";
  token: string;
  url: string;
  roomName: string;
  userId: string;
  userName: string;
  role: UserRole;
  error?: string;
  license?: {
    active: boolean;
    plan: string;
    maxResolution: QualityTier;
    maxParticipants: number;
    features: Record<string, boolean>;
    source: string;
  };
};

async function sendControl(lkRoom: Room, message: ControlMessage) {
  await lkRoom.localParticipant.sendText(JSON.stringify(message), { topic: 'liveclass-control' });
}

const DEFAULT_STUDIO_CONFIG: StudioConfig = {
  layout: 'focus',
  programCamera: null,
  pip: { kind: 'none' },
  pipPosition: 'bottom-right',
  vipIdentities: [],
  watermark: {
    enabled: true,
    text: 'Ibemhal IAS',
    position: 'top-right',
    opacity: 0.42,
  },
  quality: '720p',
};

function qualityPreset(quality: QualityTier) {
  if (quality === '4k') return VideoPresets.h2160;
  if (quality === '1080p') return VideoPresets.h1080;
  return VideoPresets.h720;
}

function resolutionRank(quality: QualityTier) {
  return quality === '4k' ? 3 : quality === '1080p' ? 2 : 1;
}

function bestVideoCodec(quality: QualityTier = '720p'): 'h264' | 'vp8' | 'vp9' | 'av1' {
  if (typeof navigator === 'undefined') return 'vp8';
  const ua = navigator.userAgent.toLowerCase();
  const safari = ua.includes('safari') && !ua.includes('chrome') && !ua.includes('chromium') && !ua.includes('android');
  if (safari) return 'h264';
  if (quality === '4k' && supportsAV1()) return 'av1';
  if (supportsVP9()) return 'vp9';
  return 'vp8';
}


function classResourceType(file: Pick<File, 'name' | 'type'>) {
  const name = file.name.toLowerCase();
  const mime = (file.type || '').toLowerCase();
  const extension = name.includes('.') ? name.split('.').pop() || '' : '';

  if (extension === 'pdf' || mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/') || ['jpg','jpeg','png','webp','gif','bmp'].includes(extension)) return 'image';
  if (mime.startsWith('audio/') || ['mp3','m4a','aac','wav','ogg','flac'].includes(extension)) return 'audio';
  if (mime.startsWith('video/') || ['mp4','mov','m4v','avi','mkv','webm'].includes(extension)) return 'video';
  if (mime.startsWith('text/') || ['txt','md','rtf','json'].includes(extension)) return 'notes';
  if (['doc','docx'].includes(extension)) return 'notes';
  if (['xls','xlsx','csv'].includes(extension)) return 'file';
  if (['ppt','pptx'].includes(extension)) return 'slides';
  if (extension === 'zip') return 'file';
  return 'file';
}

function toPresentedResource(resource: any): PresentedResource | null {
  const url = String(resource?.url || '').trim();
  if (!url) return null;
  return {
    id: String(resource?.id || crypto.randomUUID()),
    title: String(resource?.title || 'Class material'),
    url,
    resourceType: String(resource?.resource_type || resource?.resourceType || 'file').toLowerCase(),
    mimeType: String(resource?.mime_type || resource?.mimeType || 'application/octet-stream'),
  };
}

function resourceIcon(resourceType: string) {
  if (resourceType === 'image') return ImageIcon;
  if (resourceType === 'audio') return Music;
  if (resourceType === 'video') return Film;
  return FileText;
}

async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit, attempts = 3) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(input, init);
      if (response.status < 500 || attempt === attempts) return response;
      lastError = new Error(`Server returned ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt === attempts) throw error;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 350 * attempt));
  }
  throw lastError instanceof Error ? lastError : new Error('Request failed.');
}


function PresentedResourceStage({ resource }: { resource: PresentedResource | null }) {
  if (!resource) {
    return <div className="stage-empty"><strong>No class material selected.</strong></div>;
  }

  const kind = resource.resourceType.toLowerCase();
  const mime = resource.mimeType.toLowerCase();

  if (kind === 'image' || mime.startsWith('image/')) {
    return (
      <div className="resource-stage resource-stage-image">
        <img src={resource.url} alt={resource.title} />
      </div>
    );
  }

  if (kind === 'video' || mime.startsWith('video/')) {
    return (
      <div className="resource-stage resource-stage-media">
        <video src={resource.url} controls playsInline preload="metadata" />
        <strong>{resource.title}</strong>
      </div>
    );
  }

  if (kind === 'audio' || mime.startsWith('audio/')) {
    return (
      <div className="resource-stage resource-stage-audio">
        <div className="resource-stage-icon"><Music size={48} /></div>
        <strong>{resource.title}</strong>
        <audio src={resource.url} controls preload="metadata" />
      </div>
    );
  }

  if (kind === 'notes' && mime.startsWith('text/')) {
    return (
      <div className="resource-stage resource-stage-document">
        <iframe src={resource.url} title={resource.title} />
      </div>
    );
  }

  return (
    <div className="resource-stage resource-stage-generic">
      <FileText size={54} />
      <strong>{resource.title}</strong>
      <span>This file type is stored with the class. Open it in a new window to view it.</span>
      <a href={resource.url} target="_blank" rel="noreferrer">Open file</a>
    </div>
  );
}

export function LiveKitTeleclassRoom({
  classId,
  mode,
}: {
  classId: string;
  mode: "student" | "teacher";
}) {
  const [lkRoom, setLkRoom] = useState<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [role, setRole] = useState<UserRole>('student');
  const [roomName, setRoomName] = useState('');
  const [liveClass, setLiveClass] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [presentation, setPresentation] = useState<PresentationMode>('camera');
  const [sidebar, setSidebar] = useState<'people' | 'chat' | 'hands' | 'poll' | 'files'>('people');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfName, setPdfName] = useState('');
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(0);
  const [pdfAnnotate, setPdfAnnotate] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<number | null>(null);
  const [boardStrokes, setBoardStrokes] = useState<Stroke[]>([]);
  const [pdfStrokes, setPdfStrokes] = useState<Record<string, Stroke[]>>({});
  const [hands, setHands] = useState<Record<string, boolean>>({});
  const [handRaised, setHandRaised] = useState(false);
  const [poll, setPoll] = useState<PollState | null>(null);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollA, setPollA] = useState('Yes');
  const [pollB, setPollB] = useState('No');
  const [myVote, setMyVote] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [recording, setRecording] = useState(false);
  const [lighting, setLighting] = useState('auto');
  const [networkQuality, setNetworkQuality] = useState<ConnectionQuality>(ConnectionQuality.Unknown);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [studio, setStudio] = useState<StudioConfig>(DEFAULT_STUDIO_CONFIG);
  const [license, setLicense] = useState<TokenResponse['license'] | null>(null);
  const [handRaisedAt, setHandRaisedAt] = useState<Record<string, number>>({});
  const [watermarkOpen, setWatermarkOpen] = useState(false);
  const [cameraSourceOpen, setCameraSourceOpen] = useState(false);
  const [localPipHidden, setLocalPipHidden] = useState(false);
  const [activeResource, setActiveResource] = useState<PresentedResource | null>(null);
  const [resourceUploading, setResourceUploading] = useState(false);
  const [resourceUploadStatus, setResourceUploadStatus] = useState('');

  const [studioMenuOpen, setStudioMenuOpen] = useState(false);


  const pdfPayloadRef = useRef<PdfPayload | null>(null);
  const roomRef = useRef<Room | null>(null);
  const presentationRef = useRef<PresentationMode>('camera');
  const pdfPageRef = useRef(1);
  const pdfUrlRef = useRef('');
  const boardStrokesRef = useRef<Stroke[]>([]);
  const pdfStrokesRef = useRef<Record<string, Stroke[]>>({});
  const pollRef = useRef<PollState | null>(null);
  const attendanceRef = useRef(new Map<string, AttendanceEntry>());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resourceInputRef = useRef<HTMLInputElement>(null);
  const activeResourceRef = useRef<PresentedResource | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const joinStartedRef = useRef(false);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const autoRetryRef = useRef(0);
  const intentionalLeaveRef = useRef(false);
  const unmountedRef = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const extraCameraTracksRef = useRef<any[]>([]);
  const studioRef = useRef<StudioConfig>(DEFAULT_STUDIO_CONFIG);


  const isTeacher = role === 'teacher' || role === 'cohost';
  const canPublishMedia = isTeacher || role === 'speaker';
  const screenParticipant = participants.find((p) => p.isScreenShareEnabled);
  const cameraSources = useMemo(() => participants.flatMap((participant) =>
    Array.from(participant.videoTrackPublications.values())
      .filter((publication) => publication.source === Track.Source.Camera)
      .map((publication) => ({
        participant,
        ref: {
          participantIdentity: participant.identity,
          trackSid: publication.trackSid,
          label: publication.trackName || `${participant.name || participant.identity} Camera`,
        } satisfies CameraSourceRef,
      }))), [participants]);
  const raisedParticipants = useMemo(() => participants
    .filter((participant) => Boolean(hands[participant.identity]))
    .sort((a, b) => (handRaisedAt[a.identity] || 0) - (handRaisedAt[b.identity] || 0)), [participants, hands, handRaisedAt]);
  const programCameraParticipant = (
    studio.programCamera
      ? participants.find((participant) => participant.identity === studio.programCamera?.participantIdentity)
      : undefined
  ) || participants.find((participant) => participant.attributes?.role === 'teacher' || participant.attributes?.role === 'cohost') || participants[0];
  const programPublicationSid =
    studio.programCamera && programCameraParticipant?.identity === studio.programCamera.participantIdentity
      ? studio.programCamera.trackSid
      : undefined;


  useEffect(() => { presentationRef.current = presentation; }, [presentation]);
  useEffect(() => { pdfPageRef.current = pdfPage; }, [pdfPage]);
  useEffect(() => { pdfUrlRef.current = pdfUrl; }, [pdfUrl]);
  useEffect(() => { boardStrokesRef.current = boardStrokes; }, [boardStrokes]);
  useEffect(() => { pdfStrokesRef.current = pdfStrokes; }, [pdfStrokes]);
  useEffect(() => { pollRef.current = poll; }, [poll]);
  useEffect(() => { studioRef.current = studio; }, [studio]);
  useEffect(() => { activeResourceRef.current = activeResource; }, [activeResource]);

  useEffect(() => {
    if (!connected) return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/live-now/license/status?classId=${encodeURIComponent(classId)}`, { cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok || !payload?.license?.active) {
          intentionalLeaveRef.current = true;
          roomRef.current?.disconnect();
          setError('Live Now license is inactive. Contact the service provider.');
        } else {
          setLicense(payload.license);
        }
      } catch {
        // A transient license heartbeat failure does not terminate an active class.
      }
    }, 60000);
    return () => window.clearInterval(timer);
  }, [classId, connected]);

  const pollCounts = useMemo(() => {
    if (!poll) return [];
    return poll.options.map((_, index) => Object.values(poll.votes).filter((v) => v === index).length);
  }, [poll]);

  function refresh(room = lkRoom) {
    if (!room) return;
    const list = [room.localParticipant, ...Array.from(room.remoteParticipants.values())];
    const seen = new Set<string>();
    setParticipants(list.filter((participant) => {
      if (seen.has(participant.identity)) return false;
      seen.add(participant.identity);
      return true;
    }));
  }

  async function broadcastStudio(next: StudioConfig) {
    studioRef.current = next;
    setStudio(next);
    if (lkRoom && isTeacher) {
      await sendControl(lkRoom, { type: 'studio-config', studio: next });
    }
  }

  async function updateStudio(patch: Partial<StudioConfig>) {
    const next = { ...studioRef.current, ...patch };
    await broadcastStudio(next);
  }

  async function setProgramCamera(camera: CameraSourceRef) {
    await updateStudio({ programCamera: camera });
    await broadcastPresentation('camera');
  }

  async function setPipSource(pip: PipSource) {
    await updateStudio({ pip });
    setLocalPipHidden(false);
  }

  async function cyclePipPosition() {
    const order: PipPosition[] = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
    const index = Math.max(0, order.indexOf(studioRef.current.pipPosition));
    await updateStudio({ pipPosition: order[(index + 1) % order.length] });
  }

  async function toggleVip(identity: string, slot: 0 | 1) {
    const current = [...studioRef.current.vipIdentities];
    while (current.length < 2) current.push('');
    current[slot] = current[slot] === identity ? '' : identity;
    await updateStudio({ vipIdentities: current.filter(Boolean).slice(0, 2) });
  }

  async function applyQuality(quality: QualityTier) {
    const max = license?.maxResolution || '720p';
    if (resolutionRank(quality) > resolutionRank(max)) {
      showNotice(`${quality} is not included in this Live Now license.`);
      return;
    }
    await updateStudio({ quality });
    const preset = qualityPreset(quality);
    const localCameraPublications = Array.from(lkRoom?.localParticipant.videoTrackPublications.values() || [])
      .filter((publication) => publication.source === Track.Source.Camera && publication.videoTrack);
    for (const publication of localCameraPublications) {
      try { await publication.videoTrack?.restartTrack({ resolution: preset.resolution }); } catch {}
    }
    showNotice(`Camera quality set to ${quality}. Actual output depends on camera, browser and network.`);
  }

  function handNotification(name: string) {
    showNotice(`${name} raised a hand.`);
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 620;
      gain.gain.value = 0.025;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.12);
      oscillator.addEventListener('ended', () => context.close().catch(() => {}));
    } catch {}
  }

  async function addCameraSource(deviceId: string) {
    if (!lkRoom || !isTeacher || !deviceId) return;
    try {
      const track = await createLocalVideoTrack({
        deviceId,
        resolution: qualityPreset(studioRef.current.quality).resolution,
      });
      const publication = await lkRoom.localParticipant.publishTrack(track, {
        name: `Live Now Camera ${extraCameraTracksRef.current.length + 2}`,
        source: Track.Source.Camera,
        simulcast: true,
        videoCodec: bestVideoCodec(studioRef.current.quality),
      });
      extraCameraTracksRef.current.push(track);
      refresh(lkRoom);
      if (publication.trackSid) showNotice('Additional camera source added.');
      setCameraSourceOpen(false);
    } catch (cameraError) {
      console.error(cameraError);
      showNotice('Could not add that camera source. It may already be in use.');
    }
  }

  async function toggleStageFullscreen() {
    try {
      const stage = stageRef.current;
      if (!stage) return;
      if (document.fullscreenElement === stage) await document.exitFullscreen();
      else await stage.requestFullscreen();
    } catch { showNotice('Stage fullscreen is not available in this browser.'); }
  }

  async function broadcastPresentation(mode: PresentationMode) {
    if (!lkRoom || !isTeacher) return;
    if (mode !== 'screen' && lkRoom.localParticipant.isScreenShareEnabled) {
      try { await lkRoom.localParticipant.setScreenShareEnabled(false); } catch {}
    }
    presentationRef.current = mode;
    setPresentation(mode);
    await sendControl(lkRoom, { type: 'presentation', mode });
  }

  async function resumePdf() {
    if (!lkRoom || !isTeacher) return;
    if (!pdfUrlRef.current) {
      fileInputRef.current?.click();
      return;
    }
    setPdfAnnotate(false);
    if (lkRoom.localParticipant.isScreenShareEnabled) {
      try { await lkRoom.localParticipant.setScreenShareEnabled(false); } catch {}
    }
    presentationRef.current = 'pdf';
    setPresentation('pdf');
    await sendControl(lkRoom, { type: 'pdf-meta', name: pdfName || 'Presentation.pdf', page: pdfPageRef.current });
    await sendControl(lkRoom, { type: 'presentation', mode: 'pdf' });
  }

  function showNotice(text: string) {
    setNotice(text);
    window.setTimeout(() => setNotice(''), 3000);
  }

  function clearRetryTimer() {
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }

  function scheduleReconnect(reason: string) {
    if (unmountedRef.current || intentionalLeaveRef.current) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setNetworkQuality(ConnectionQuality.Lost);
      setError('Internet connection is offline. Live Now will retry automatically when the network returns.');
      return;
    }
    if (retryTimerRef.current !== null) return;

    const attempt = Math.min(autoRetryRef.current + 1, 3);
    autoRetryRef.current = attempt;
    setReconnectAttempt(attempt);
    const delay = Math.min(1200 * attempt, 3600);
    setError(`Live Now connection was interrupted. Automatic retry ${attempt}/3...`);
    retryTimerRef.current = window.setTimeout(() => {
      retryTimerRef.current = null;
      if (unmountedRef.current || intentionalLeaveRef.current) return;
      joinStartedRef.current = false;
      void join();
    }, delay);
    console.warn('Live Now transient connection issue; retry scheduled.', { reason, attempt, delay });
  }

  async function loadClassData() {
    const endpoint =
      mode === "student"
        ? `/api/live-class/student?classId=${encodeURIComponent(classId)}`
        : `/api/live-class/provider?classId=${encodeURIComponent(classId)}`;

    const response = await fetchWithRetry(endpoint, { cache: "no-store" }, 3);
    const payload = await response.json();

    if (!response.ok) {
      if (mode === "student" && response.status === 401) {
        window.location.replace(
          `/login?redirectedFrom=${encodeURIComponent(`/live-classes/${classId}`)}`
        );
        throw new Error("UNAUTHENTICATED");
      }
      throw new Error(payload.error || "Unable to load live class.");
    }

    setLiveClass(payload.liveClass || null);
    return payload;
  }

  async function join() {
    if (joinStartedRef.current) return;
    joinStartedRef.current = true;
    setJoining(true);
    setLoading(true);
    setError("");

    try {
      await loadClassData();

      const response = await fetchWithRetry("/api/live-class/provider/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ classId }),
        cache: "no-store",
      }, 3);
      const data = (await response.json()) as TokenResponse;

      if (!response.ok) {
        if (mode === "student" && response.status === 401) {
          window.location.replace(
            `/login?redirectedFrom=${encodeURIComponent(`/live-classes/${classId}`)}`
          );
          return;
        }
        throw new Error(data.error || "Could not create LiveKit room token.");
      }

      if (data.provider !== "livekit") {
        throw new Error("This class is not configured to use LiveKit.");
      }

      const grantedRole = data.role;
      setRole(grantedRole);
      setRoomName(data.roomName);
      setLicense(data.license || null);
      const licensedQuality = data.license?.maxResolution || '720p';
      const initialQuality: QualityTier = resolutionRank(studioRef.current.quality) <= resolutionRank(licensedQuality)
        ? studioRef.current.quality
        : licensedQuality;
      const initialStudio = { ...studioRef.current, quality: initialQuality };
      studioRef.current = initialStudio;
      setStudio(initialStudio);

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        disconnectOnPageLeave: true,
        videoCaptureDefaults: {
          resolution: qualityPreset(initialQuality).resolution,
        },
        publishDefaults: {
          videoCodec: bestVideoCodec(initialQuality),
          simulcast: true,
        },
      });

      const updateConnection = (state: ConnectionState) => {
        setConnection(state);
        if (state === ConnectionState.Connected) {
          setConnected(true);
          setError('');
          autoRetryRef.current = 0;
          setReconnectAttempt(0);
          clearRetryTimer();
        } else if (state === ConnectionState.Disconnected) {
          setConnected(false);
        }
      };

      const markJoined = (participant: Participant) => {
        if (participant.isLocal) return;
        const now = Date.now();
        const old = attendanceRef.current.get(participant.identity);
        attendanceRef.current.set(participant.identity, {
          name: participant.name || participant.identity,
          firstJoin: old?.firstJoin || now,
          activeSince: now,
          totalMs: old?.totalMs || 0,
        });
      };

      const markLeft = (participant: Participant) => {
        const old = attendanceRef.current.get(participant.identity);
        if (!old) return;
        const now = Date.now();
        attendanceRef.current.set(participant.identity, {
          ...old,
          totalMs: old.totalMs + (old.activeSince ? now - old.activeSince : 0),
          activeSince: null,
        });
        setHands((prev) => ({ ...prev, [participant.identity]: false }));
      };

      room.registerTextStreamHandler('liveclass-control', async (reader, participantInfo) => {
        try {
          const raw = await reader.readAll();
          const message = JSON.parse(raw) as ControlMessage;
          switch (message.type) {
            case 'presentation':
              presentationRef.current = message.mode;
              setPresentation(message.mode);
              break;
            case 'studio-config':
              studioRef.current = message.studio;
              setStudio(message.studio);
              setLocalPipHidden(false);
              break;
            case 'state-sync': {
              const snapshot = message.snapshot;
              presentationRef.current = snapshot.presentation;
              pdfPageRef.current = Math.max(1, snapshot.pdfPage || 1);
              setPresentation(snapshot.presentation);
              setPdfName(snapshot.pdfName || '');
              setPdfPage(pdfPageRef.current);
              setBoardStrokes(snapshot.boardStrokes || []);
              setPdfStrokes(snapshot.pdfStrokes || {});
              if (snapshot.studio) {
                studioRef.current = snapshot.studio;
                setStudio(snapshot.studio);
              }
              if (snapshot.activeResource) {
                activeResourceRef.current = snapshot.activeResource;
                setActiveResource(snapshot.activeResource);
              }
              if (snapshot.pdfUrl) {
                pdfUrlRef.current = snapshot.pdfUrl;
                setPdfUrl((old) => {
                  if (old.startsWith('blob:')) URL.revokeObjectURL(old);
                  return snapshot.pdfUrl || '';
                });
              }
              const syncedPoll = snapshot.poll;
              if (syncedPoll) setPoll((old) => old?.id === syncedPoll.id ? old : { ...syncedPoll, votes: {} });
              else setPoll(null);
              break;
            }
            case 'pdf-meta':
              setPdfName(message.name);
              pdfPageRef.current = Math.max(1, message.page);
              setPdfPage(pdfPageRef.current);
              presentationRef.current = 'pdf';
              setPresentation('pdf');
              break;
            case 'pdf-url':
              setPdfName(message.name);
              pdfPageRef.current = Math.max(1, message.page);
              setPdfPage(pdfPageRef.current);
              pdfUrlRef.current = message.url;
              setPdfUrl((old) => {
                if (old.startsWith('blob:')) URL.revokeObjectURL(old);
                return message.url;
              });
              presentationRef.current = 'pdf';
              setPresentation('pdf');
              break;
            case 'resource-present':
              activeResourceRef.current = message.resource;
              setActiveResource(message.resource);
              presentationRef.current = 'resource';
              setPresentation('resource');
              break;
            case 'pdf-page':
              pdfPageRef.current = Math.max(1, message.page);
              setPdfPage(pdfPageRef.current);
              break;
            case 'whiteboard-stroke': {
              if (message.surface === 'pdf') {
                const key = String(message.page || pdfPageRef.current);
                setPdfStrokes((old) => ({ ...old, [key]: [...(old[key] || []), message.stroke].slice(-300) }));
              } else setBoardStrokes((old) => [...old, message.stroke].slice(-500));
              break;
            }
            case 'whiteboard-clear': {
              if (message.surface === 'pdf') {
                const key = String(message.page || pdfPageRef.current);
                setPdfStrokes((old) => ({ ...old, [key]: [] }));
              } else setBoardStrokes([]);
              break;
            }
            case 'hand':
              setHands((old) => ({ ...old, [participantInfo.identity]: message.raised }));
              setHandRaisedAt((old) => ({
                ...old,
                [participantInfo.identity]: message.raised ? (message.raisedAt || Date.now()) : 0,
              }));
              if (message.raised && (grantedRole === 'teacher' || grantedRole === 'cohost')) {
                handNotification(String(participantInfo.identity || "Student"));
              }
              break;
            case 'hand-dismiss':
              setHandRaised(false);
              setHands((old) => ({ ...old, [room.localParticipant.identity]: false }));
              showNotice('Your raised hand was dismissed by the teacher.');
              break;
            case 'poll-new':
              setPoll({ ...message.poll, votes: {} });
              setMyVote(null);
              setSidebar('poll');
              break;
            case 'poll-vote':
              if (grantedRole === 'teacher' || grantedRole === 'cohost') {
                setPoll((old) => old && old.id === message.pollId ? { ...old, votes: { ...old.votes, [participantInfo.identity]: message.option } } : old);
              }
              break;
            case 'poll-counts':
              setPoll((old) => old && old.id === message.pollId ? { ...old, votes: message.votes } : old);
              break;
          }
        } catch (handlerError) {
          console.warn('Ignored malformed classroom control message', handlerError);
        }
      });

      room.registerByteStreamHandler('liveclass-pdf', async (reader) => {
        const chunks = await reader.readAll();
        const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
        const merged = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
        const blob = new Blob([merged.buffer], { type: reader.info.mimeType || 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        pdfUrlRef.current = blobUrl;
        setPdfUrl((old) => {
          if (old.startsWith('blob:')) URL.revokeObjectURL(old);
          return blobUrl;
        });
        setPdfName(reader.info.name || 'Presentation.pdf');
        setPdfProgress(null);
      });

      room.on(RoomEvent.ConnectionStateChanged, updateConnection);
      room.on(RoomEvent.ParticipantConnected, (participant) => {
        markJoined(participant);
        refresh(room);
        if (grantedRole === 'teacher' || grantedRole === 'cohost') {
          const destinationIdentities = [participant.identity];
          window.setTimeout(() => {
            const payload = pdfPayloadRef.current;
            if (payload) {
              room.localParticipant.sendBytes(payload.bytes, {
                topic: 'liveclass-pdf', name: payload.name, mimeType: payload.mimeType, destinationIdentities,
              }).catch(console.error);
            }
            const activePoll = pollRef.current;
            const snapshot: ClassroomSnapshot = {
              presentation: presentationRef.current,
              pdfName: payload?.name || '',
              pdfPage: pdfPageRef.current,
              boardStrokes: boardStrokesRef.current.slice(-300),
              pdfStrokes: Object.fromEntries(Object.entries(pdfStrokesRef.current as Record<string, Stroke[]>).map(([page, pageStrokes]) => [page, pageStrokes.slice(-200)])),
              poll: activePoll ? { id: activePoll.id, question: activePoll.question, options: activePoll.options } : null,
              studio: studioRef.current,
              activeResource: activeResourceRef.current,
              pdfUrl: pdfUrlRef.current && !pdfUrlRef.current.startsWith('blob:') ? pdfUrlRef.current : undefined,
            };
            room.localParticipant.sendText(JSON.stringify({ type: 'state-sync', snapshot } satisfies ControlMessage), {
              topic: 'liveclass-control', destinationIdentities,
            }).catch(console.error);
          }, 400);
        }
      });
      room.on(RoomEvent.ParticipantDisconnected, (participant) => { markLeft(participant); refresh(room); });
      room.on(RoomEvent.TrackSubscribed, () => refresh(room));
      room.on(RoomEvent.TrackUnsubscribed, () => refresh(room));
      room.on(RoomEvent.TrackMuted, () => refresh(room));
      room.on(RoomEvent.TrackUnmuted, () => refresh(room));
      room.on(RoomEvent.LocalTrackPublished, () => refresh(room));
      room.on(RoomEvent.LocalTrackUnpublished, (publication) => {
        refresh(room);
        if (publication.source === Track.Source.ScreenShare && presentationRef.current === 'screen') {
          presentationRef.current = 'camera';
          setPresentation('camera');
          sendControl(room, { type: 'presentation', mode: 'camera' }).catch(console.error);
        }
      });
      room.on(RoomEvent.ParticipantPermissionsChanged, async (_previous, participant) => {
        if (participant.isLocal) {
          const granted = Boolean(participant.permissions?.canPublish);
          const attributeRole = participant.attributes?.role as UserRole | undefined;
          const nextRole: UserRole = attributeRole === 'speaker' || attributeRole === 'cohost' || attributeRole === 'teacher'
            ? attributeRole : granted ? 'speaker' : 'student';
          setRole(nextRole);
          if (!granted) {
            try { await room.localParticipant.setMicrophoneEnabled(false); } catch {}
            try { await room.localParticipant.setCameraEnabled(false); } catch {}
            showNotice('Returned to viewer mode.');
          } else if (nextRole === 'speaker') showNotice('You are now a speaker. Microphone and camera are available.');
        }
        refresh(room);
      });
      room.on(RoomEvent.ParticipantAttributesChanged, (_changed, participant) => {
        if (participant.isLocal) {
          const nextRole = participant.attributes?.role as UserRole | undefined;
          if (nextRole) setRole(nextRole);
        }
        refresh(room);
      });
      room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
        if (participant.isLocal) setNetworkQuality(quality);
        refresh(room);
      });
      room.on(RoomEvent.Reconnecting, () => {
        setConnection(ConnectionState.Reconnecting);
        showNotice('Network changed - Live Now is reconnecting...');
      });
      room.on(RoomEvent.Reconnected, () => {
        setConnected(true);
        setError('');
        autoRetryRef.current = 0;
        setReconnectAttempt(0);
        clearRetryTimer();
        showNotice('Live Now reconnected.');
      });
      room.on(RoomEvent.Disconnected, (reason) => {
        setConnected(false);
        if (!intentionalLeaveRef.current && !unmountedRef.current) {
          scheduleReconnect(String(reason || 'unexpected_disconnect'));
        }
      });

      room.prepareConnection(data.url, data.token);
      await room.connect(data.url, data.token);
      roomRef.current = room;
      setLkRoom(room);
      setConnected(true);
      setConnection(room.state);
      setError('');
      autoRetryRef.current = 0;
      setReconnectAttempt(0);
      clearRetryTimer();
      setNetworkQuality(room.localParticipant.connectionQuality || ConnectionQuality.Unknown);
      refresh(room);
      for (const p of room.remoteParticipants.values()) markJoined(p);

      if (mode === "student") {
        fetch("/api/live-class/student", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classId, event: "join" }),
        }).catch(() => {});
      }

      if (grantedRole === 'teacher' || grantedRole === 'cohost') {
        try { await room.localParticipant.setMicrophoneEnabled(true); } catch { showNotice('Microphone is off. You can enable it later.'); }
        try {
          const primary = await room.localParticipant.setCameraEnabled(true, {
            resolution: qualityPreset(initialQuality).resolution,
          }, {
            simulcast: true,
            videoCodec: bestVideoCodec(initialQuality),
          });
          if (primary?.trackSid && !studioRef.current.programCamera) {
            const nextStudio: StudioConfig = {
              ...studioRef.current,
              programCamera: {
                participantIdentity: room.localParticipant.identity,
                trackSid: primary.trackSid,
                label: 'Teacher Camera',
              },
            };
            studioRef.current = nextStudio;
            setStudio(nextStudio);
            await sendControl(room, { type: 'studio-config', studio: nextStudio });
          }
        } catch { showNotice('Camera is off. You can enable it later.'); }
      }
      refresh(room);
    } catch (joinError) {
      let message = joinError instanceof Error ? joinError.message : 'Could not join the room.';
      const rawMessage = message;
      if (/failed to construct.*url|invalid url/i.test(message)) {
        message = 'Live Now server address is invalid. Restart Live Now using START-LIVE-NOW.ps1.';
      } else if (/websocket|signal connection|connection failed/i.test(message)) {
        message = 'Live Now media server is not reachable. Restart Live Now, then retry.';
      }

      const transient =
        /could not establish pc connection|failed to connect|connection.*(closed|lost|timeout|timed out)|ice/i.test(rawMessage);

      if (message !== "UNAUTHENTICATED") {
        if (transient && autoRetryRef.current < 3) {
          console.warn('Live Now connection attempt failed transiently.', joinError);
          joinStartedRef.current = false;
          scheduleReconnect(rawMessage);
        } else {
          console.error(joinError);
          setError(message);
          joinStartedRef.current = false;
        }
      } else {
        joinStartedRef.current = false;
      }
    } finally {
      setJoining(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    unmountedRef.current = false;
    intentionalLeaveRef.current = false;

    const onOffline = () => {
      setNetworkQuality(ConnectionQuality.Lost);
      setError('Internet connection is offline. Live Now will retry automatically.');
      showNotice('Network offline - waiting to reconnect...');
    };

    const onOnline = () => {
      showNotice('Network restored - reconnecting Live Now...');
      if (!roomRef.current || roomRef.current.state === ConnectionState.Disconnected) {
        clearRetryTimer();
        joinStartedRef.current = false;
        void join();
      }
    };

    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    void join();

    return () => {
      unmountedRef.current = true;
      intentionalLeaveRef.current = true;
      clearRetryTimer();
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      roomRef.current?.disconnect();
      roomRef.current = null;
      if (mode === "student") {
        fetch("/api/live-class/student", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classId, event: "leave" }),
          keepalive: true,
        }).catch(() => {});
      }
      if (pdfUrlRef.current.startsWith('blob:')) URL.revokeObjectURL(pdfUrlRef.current);
    };
    // join() intentionally runs only when the class identity or mode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, mode]);

  async function toggleMic() {
    if (!lkRoom) return;
    if (!canPublishMedia) return showNotice('Raise your hand and wait for the teacher to allow you to speak.');
    try {
      await lkRoom.localParticipant.setMicrophoneEnabled(!lkRoom.localParticipant.isMicrophoneEnabled);
      refresh();
    } catch { showNotice('Microphone permission was blocked by the browser.'); }
  }

  async function toggleCamera() {
    if (!lkRoom) return;
    if (!canPublishMedia) return showNotice('Camera is available after the teacher promotes you to speaker.');
    try {
      if (isTeacher && presentationRef.current !== 'camera') {
        await broadcastPresentation('camera');
        if (!lkRoom.localParticipant.isCameraEnabled) await lkRoom.localParticipant.setCameraEnabled(true);
        refresh();
        return;
      }
      await lkRoom.localParticipant.setCameraEnabled(!lkRoom.localParticipant.isCameraEnabled);
      refresh();
    } catch { showNotice('Camera permission was blocked by the browser.'); }
  }

  async function toggleScreen() {
    if (!lkRoom || !isTeacher) return showNotice('Only the teacher/co-host can share the screen.');
    try {
      const next = !lkRoom.localParticipant.isScreenShareEnabled;
      await lkRoom.localParticipant.setScreenShareEnabled(next, { audio: true });
      const mode: PresentationMode = next ? 'screen' : 'camera';
      presentationRef.current = mode;
      setPresentation(mode);
      await sendControl(lkRoom, { type: 'presentation', mode });
      refresh();
    } catch { showNotice('Screen sharing was cancelled or blocked.'); }
  }

  async function persistClassResource(file: File, reloadAfter = false) {
    const mime = file.type || 'application/octet-stream';
    const resourceType = classResourceType(file);

    const prepareResponse = await fetchWithRetry("/api/live-class/resource", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "prepare",
        classId,
        fileName: file.name,
        mime,
        size: file.size,
        resourceType,
      }),
    }, 3);
    const prepared = await prepareResponse.json();
    if (!prepareResponse.ok) throw new Error(prepared.error || "Unable to prepare class-material upload.");

    const supabase = createClient();
    if (!supabase) throw new Error("Supabase client is unavailable.");
    const upload = prepared.upload;
    const { error: storageError } = await supabase.storage
      .from(upload.bucket)
      .uploadToSignedUrl(upload.path, upload.token, file, {
        contentType: mime,
      });
    if (storageError) throw storageError;

    const commitResponse = await fetchWithRetry("/api/live-class/resource", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "commit",
        classId,
        path: upload.path,
        title: file.name,
        mime,
        size: file.size,
        resourceType,
      }),
    }, 3);
    const committed = await commitResponse.json();
    if (!commitResponse.ok) throw new Error(committed.error || "Unable to save class material.");

    if (reloadAfter) await loadClassData();
    return committed.resource;
  }

  async function uploadClassResources(fileList: FileList | File[]) {
    if (!isTeacher || resourceUploading) return;
    const files = Array.from(fileList).slice(0, 20);
    if (!files.length) return;

    setResourceUploading(true);
    setSidebar('files');
    setMobilePanelOpen(true);

    let uploaded = 0;
    const failures: string[] = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      setResourceUploadStatus(`Uploading ${index + 1}/${files.length}: ${file.name}`);
      try {
        await persistClassResource(file, false);
        uploaded += 1;
      } catch (uploadError: any) {
        console.error('Class material upload failed', uploadError);
        failures.push(`${file.name}: ${uploadError?.message || 'Upload failed'}`);
      }
    }

    try { await loadClassData(); } catch (refreshError) { console.error(refreshError); }

    setResourceUploading(false);
    setResourceUploadStatus('');

    if (failures.length) {
      showNotice(`${uploaded} uploaded; ${failures.length} failed. Check the Files panel.`);
    } else {
      showNotice(`${uploaded} class material${uploaded === 1 ? '' : 's'} uploaded.`);
    }
  }

  async function deleteClassResource(resource: any) {
    if (!isTeacher || !resource?.id) return;
    if (typeof window !== 'undefined' && !window.confirm(`Remove "${resource.title || 'this file'}" from this class?`)) return;

    try {
      const response = await fetchWithRetry(
        `/api/live-class/resource?id=${encodeURIComponent(String(resource.id))}`,
        { method: 'DELETE' },
        3,
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not delete class material.');

      if (activeResourceRef.current?.id === String(resource.id)) {
        activeResourceRef.current = null;
        setActiveResource(null);
        if (lkRoom && isTeacher) await broadcastPresentation('camera');
      }

      await loadClassData();
      showNotice('Class material removed.');
    } catch (deleteError: any) {
      console.error(deleteError);
      showNotice(deleteError?.message || 'Could not remove class material.');
    }
  }

  async function presentStoredPdf(resource: any) {
    if (!resource?.url || !isTeacher || !lkRoom) return;
    try {
      if (lkRoom.localParticipant.isScreenShareEnabled) {
        try { await lkRoom.localParticipant.setScreenShareEnabled(false); } catch {}
      }

      const url = String(resource.url);
      pdfPayloadRef.current = null;
      pdfUrlRef.current = url;
      setPdfUrl((old) => {
        if (old.startsWith('blob:')) URL.revokeObjectURL(old);
        return url;
      });
      setPdfName(resource.title || 'Presentation.pdf');
      setPdfTotalPages(0);
      setPdfAnnotate(false);
      pdfPageRef.current = 1;
      setPdfPage(1);
      presentationRef.current = 'pdf';
      setPresentation('pdf');
      activeResourceRef.current = null;
      setActiveResource(null);
      pdfStrokesRef.current = {};
      setPdfStrokes({});

      await sendControl(lkRoom, {
        type: 'pdf-url',
        name: resource.title || 'Presentation.pdf',
        url,
        page: 1,
      });
      await sendControl(lkRoom, { type: 'presentation', mode: 'pdf' });
      setMobilePanelOpen(false);
      showNotice(`Presenting ${resource.title || 'PDF'}.`);
    } catch (resourceError) {
      console.error(resourceError);
      showNotice("Could not present that stored PDF.");
    }
  }

  async function presentStoredResource(resource: any) {
    if (!resource?.url || !isTeacher || !lkRoom) return;

    const kind = String(resource.resource_type || '').toLowerCase();
    if (kind === 'pdf' || String(resource.mime_type || '').toLowerCase() === 'application/pdf') {
      await presentStoredPdf(resource);
      return;
    }

    const presented = toPresentedResource(resource);
    if (!presented) return showNotice('This file does not have a usable class URL.');

    try {
      if (lkRoom.localParticipant.isScreenShareEnabled) {
        try { await lkRoom.localParticipant.setScreenShareEnabled(false); } catch {}
      }

      activeResourceRef.current = presented;
      setActiveResource(presented);
      presentationRef.current = 'resource';
      setPresentation('resource');
      await sendControl(lkRoom, { type: 'resource-present', resource: presented });
      await sendControl(lkRoom, { type: 'presentation', mode: 'resource' });
      setMobilePanelOpen(false);
      showNotice(`Presenting ${presented.title}.`);
    } catch (resourceError) {
      console.error(resourceError);
      showNotice('Could not present that class material.');
    }
  }

  async function choosePdf(file?: File, persist = true) {
    if (!lkRoom || !file || !isTeacher) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return showNotice('Please select a PDF file.');
    }
    if (file.size > 50 * 1024 * 1024) {
      return showNotice('Maximum PDF size is 50 MB.');
    }

    if (lkRoom.localParticipant.isScreenShareEnabled) {
      try { await lkRoom.localParticipant.setScreenShareEnabled(false); } catch {}
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    pdfPayloadRef.current = { bytes, name: file.name, mimeType: file.type || 'application/pdf' };

    const localUrl = URL.createObjectURL(new Blob(
      [bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer],
      { type: 'application/pdf' },
    ));
    pdfUrlRef.current = localUrl;
    setPdfUrl((old) => {
      if (old.startsWith('blob:')) URL.revokeObjectURL(old);
      return localUrl;
    });
    setPdfName(file.name);
    setPdfTotalPages(0);
    setPdfAnnotate(false);
    pdfPageRef.current = 1;
    presentationRef.current = 'pdf';
    setPdfPage(1);
    setPresentation('pdf');
    setPdfProgress(persist ? 0 : null);
    activeResourceRef.current = null;
    setActiveResource(null);
    pdfStrokesRef.current = {};
    setPdfStrokes({});

    await sendControl(lkRoom, { type: 'pdf-meta', name: file.name, page: 1 });
    await sendControl(lkRoom, { type: 'presentation', mode: 'pdf' });

    if (persist) {
      try {
        const stored = await persistClassResource(file, false);
        const storedUrl = String(stored?.url || '');
        if (storedUrl) {
          pdfPayloadRef.current = null;
          pdfUrlRef.current = storedUrl;
          setPdfUrl((old) => {
            if (old.startsWith('blob:')) URL.revokeObjectURL(old);
            return storedUrl;
          });
          await sendControl(lkRoom, {
            type: 'pdf-url',
            name: file.name,
            url: storedUrl,
            page: 1,
          });
          setPdfProgress(null);
          await loadClassData();
          showNotice('PDF uploaded and ready for presentation.');
          return;
        }
      } catch (storageError) {
        console.warn('Stored PDF upload failed; using LiveKit byte fallback.', storageError);
      }
    }

    // Fallback only. Normally PDFs are distributed from class storage so one teacher
    // does not have to push a large PDF to every student through the realtime room.
    setPdfProgress(0);
    try {
      await lkRoom.localParticipant.sendBytes(bytes, {
        topic: 'liveclass-pdf',
        name: file.name,
        mimeType: 'application/pdf',
        onProgress: (progress) => setPdfProgress(Math.round(progress <= 1 ? progress * 100 : progress)),
      });
      setPdfProgress(null);
      if (persist) showNotice('PDF is live, but class-material storage failed; using room transfer fallback.');
    } catch (transferError) {
      console.error(transferError);
      setPdfProgress(null);
      showNotice('PDF opened locally, but transfer to students failed.');
    }
  }

  async function changePdfPage(page: number) {
    if (!lkRoom || !isTeacher) return;
    const upper = pdfTotalPages > 0 ? pdfTotalPages : Number.MAX_SAFE_INTEGER;
    const safe = Math.max(1, Math.min(page, upper));
    pdfPageRef.current = safe;
    setPdfPage(safe);
    await sendControl(lkRoom, { type: 'pdf-page', page: safe });
  }

  function handlePdfPageCount(total: number) {
    setPdfTotalPages(total);
    if (total > 0 && pdfPageRef.current > total) {
      const safe = total;
      pdfPageRef.current = safe;
      setPdfPage(safe);
      if (lkRoom && isTeacher) sendControl(lkRoom, { type: 'pdf-page', page: safe }).catch(console.error);
    }
  }

  async function addStroke(stroke: Stroke) {
    if (!lkRoom || !isTeacher) return;
    if (presentationRef.current === 'pdf') {
      const page = pdfPageRef.current;
      const key = String(page);
      setPdfStrokes((old) => {
        const next = { ...old, [key]: [...(old[key] || []), stroke].slice(-300) };
        pdfStrokesRef.current = next;
        return next;
      });
      await sendControl(lkRoom, { type: 'whiteboard-stroke', surface: 'pdf', page, stroke });
    } else {
      setBoardStrokes((old) => {
        const next = [...old, stroke].slice(-500);
        boardStrokesRef.current = next;
        return next;
      });
      await sendControl(lkRoom, { type: 'whiteboard-stroke', surface: 'board', stroke });
    }
  }

  async function clearWhiteboard() {
    if (!lkRoom || !isTeacher) return;
    if (presentationRef.current === 'pdf') {
      const page = pdfPageRef.current;
      const key = String(page);
      setPdfStrokes((old) => {
        const next = { ...old, [key]: [] };
        pdfStrokesRef.current = next;
        return next;
      });
      await sendControl(lkRoom, { type: 'whiteboard-clear', surface: 'pdf', page });
    } else {
      boardStrokesRef.current = [];
      setBoardStrokes([]);
      await sendControl(lkRoom, { type: 'whiteboard-clear', surface: 'board' });
    }
  }

  async function openWhiteboard() {
    if (!lkRoom || !isTeacher) return;
    setPdfAnnotate(false);
    await broadcastPresentation('whiteboard');
  }

  async function toggleHand() {
    if (!lkRoom) return;
    const raised = !handRaised;
    setHandRaised(raised);
    setHands((old) => ({ ...old, [lkRoom.localParticipant.identity]: raised }));
    const raisedAt = raised ? Date.now() : 0;
    setHandRaisedAt((old) => ({ ...old, [lkRoom.localParticipant.identity]: raisedAt }));
    await sendControl(lkRoom, { type: 'hand', raised, raisedAt });
  }

  async function createPoll(e: FormEvent) {
    e.preventDefault();
    if (!lkRoom || !isTeacher || !pollQuestion.trim() || !pollA.trim() || !pollB.trim()) return;
    const next: PollState = {
      id: crypto.randomUUID(),
      question: pollQuestion.trim(),
      options: [pollA.trim(), pollB.trim()],
      votes: {},
    };
    pollRef.current = next;
    setPoll(next);
    setMyVote(null);
    await sendControl(lkRoom, { type: 'poll-new', poll: { id: next.id, question: next.question, options: next.options } });
  }

  async function vote(option: number) {
    if (!lkRoom || !poll) return;
    setMyVote(option);
    if (isTeacher) setPoll((old) => old ? { ...old, votes: { ...old.votes, [lkRoom.localParticipant.identity]: option } } : old);
    await sendControl(lkRoom, { type: 'poll-vote', pollId: poll.id, option });
  }

  async function moderate(target: Participant, action: 'kick' | 'mute' | 'promote' | 'demote' | 'allow-mic' | 'allow-camera') {
    if (!lkRoom || !isTeacher) return;
    const trackSid = action === 'mute' ? target.getTrackPublication(Track.Source.Microphone)?.trackSid : undefined;
    if (action === 'mute' && !trackSid) return showNotice('This participant has no active microphone track.');
    const response = await fetch('/api/live-class/provider/moderate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ classId, targetIdentity: target.identity, action, trackSid }),
    });
    if (!response.ok) return showNotice('Host action failed.');
    if (action === 'promote' || action === 'allow-mic' || action === 'allow-camera') {
      setHands((old) => ({ ...old, [target.identity]: false }));
      setHandRaisedAt((old) => ({ ...old, [target.identity]: 0 }));
      showNotice(`${target.name || target.identity} is now a speaker.`);
    }
    if (action === 'demote') showNotice(`${target.name || target.identity} returned to viewer mode.`);
  }

  async function dismissHand(target: Participant) {
    if (!lkRoom || !isTeacher) return;
    setHands((old) => ({ ...old, [target.identity]: false }));
    setHandRaisedAt((old) => ({ ...old, [target.identity]: 0 }));
    try {
      await lkRoom.localParticipant.sendText(JSON.stringify({ type: 'hand-dismiss' } satisfies ControlMessage), {
        topic: 'liveclass-control',
        destinationIdentities: [target.identity],
      });
    } catch { showNotice('Could not dismiss the raised hand.'); }
  }

  async function switchCamera() {
    if (!lkRoom || !canPublishMedia) return;
    try {
      const cameras = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
      if (cameras.length < 2) return showNotice('Only one camera is available.');
      const current = lkRoom.getActiveDevice('videoinput');
      const index = Math.max(0, cameras.findIndex((d) => d.deviceId === current));
      const next = cameras[(index + 1) % cameras.length];
      await lkRoom.switchActiveDevice('videoinput', next.deviceId);
      showNotice('Camera switched.');
    } catch { showNotice('Could not switch camera.'); }
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch { showNotice('Fullscreen is not available in this browser.'); }
  }

  async function loadDevices() {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices(list);
      setSettingsOpen(true);
    } catch { showNotice('Could not read media devices.'); }
  }

  async function switchDevice(kind: MediaDeviceKind, id: string) {
    if (!lkRoom || !id) return;
    try { await lkRoom.switchActiveDevice(kind, id); } catch { showNotice('This browser could not switch that device.'); }
  }

  async function copyJoinLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/live-classes/${classId}`);
      showNotice("Student join link copied.");
    } catch {
      showNotice("Could not copy the join link.");
    }
  }

  async function setLight(scene: string) {
    setLighting(scene);
    try {
      const response = await fetch("/api/live-class/lighting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, scene }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Lighting control failed.");
      if (!payload.configured && payload.message) showNotice(payload.message);
    } catch (lightError) {
      console.error(lightError);
      showNotice("Lighting control could not be applied.");
    }
  }

  async function toggleRecording() {
    if (!isTeacher) return;
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      recordStreamRef.current = stream;
      recordChunksRef.current = [];
      const preferred = 'video/webm;codecs=vp9,opus';
      const recorder = new MediaRecorder(stream, MediaRecorder.isTypeSupported(preferred) ? { mimeType: preferred } : undefined);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) recordChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(recordChunksRef.current, { type: recorder.mimeType || 'video/webm' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${roomName || classId}-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        recordStreamRef.current?.getTracks().forEach((t) => t.stop());
        recordStreamRef.current = null;
        recorderRef.current = null;
        setRecording(false);
      };
      stream.getVideoTracks()[0]?.addEventListener('ended', () => recorder.state !== 'inactive' && recorder.stop());
      recorder.start(1000);
      setRecording(true);
      showNotice('Select this browser tab in the share dialog to record the class locally.');
    } catch { showNotice('Recording was cancelled.'); }
  }

  function exportAttendance() {
    const now = Date.now();
    const rows = [['Name', 'Identity', 'First joined', 'Minutes']];
    attendanceRef.current.forEach((entry, identity) => {
      const total = entry.totalMs + (entry.activeSince ? now - entry.activeSince : 0);
      rows.push([entry.name, identity, new Date(entry.firstJoin).toISOString(), (total / 60000).toFixed(1)]);
    });
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${roomName || classId}-attendance.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function leave() {
    intentionalLeaveRef.current = true;
    clearRetryTimer();
    for (const track of extraCameraTracksRef.current) {
      try { track.stop?.(); } catch {}
    }
    extraCameraTracksRef.current = [];
    lkRoom?.disconnect();
    roomRef.current = null;
    setLkRoom(null);
    setConnected(false);
    setParticipants([]);
    joinStartedRef.current = false;
    if (mode === "student") {
      fetch("/api/live-class/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, event: "leave" }),
        keepalive: true,
      }).catch(() => {});
    }
  }

  if (!connected || !lkRoom) {
    return (
      <main className="ib-livekit lk-loading-shell" data-theme={theme}>
        <section className="lk-loading-card">
          <IbemhalLogo className="h-12 w-auto" priority />
          <p className="eyebrow">LIVE NOW - {liveClass?.title || classId}</p>
          <h1>Ibemhal IAS Live Now</h1>
          <p>
            {error
              ? error
              : joining || loading
                ? "Connecting securely to the classroom..."
                : "Ready to join the classroom."}
          </p>
          {error ? <div className="error-box">{error}</div> : null}
          <button
            className="primary join-button"
            type="button"
            disabled={joining}
            onClick={() => {
              intentionalLeaveRef.current = false;
              autoRetryRef.current = 0;
              setReconnectAttempt(0);
              clearRetryTimer();
              joinStartedRef.current = false;
              void join();
            }}
          >
            {joining ? "Connecting..." : error ? "Retry" : "Join Class"}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="ib-livekit live-shell" data-theme={theme}>
      <RemoteAudio participants={participants} />
      <header className="live-header">
        <div className="live-brand">
          <div className="lk-brand-logo"><IbemhalLogo className="h-9 w-auto" /></div>
          <div className="live-brand-copy">
            <strong>Ibemhal IAS Live Now</strong>
            <small>{liveClass?.title || roomName || classId} - {role}</small>
          </div>
        </div>
        <div className="live-status">
          <span className={`live-indicator ${connection === ConnectionState.Connected ? 'online' : ''}`}>
            <span className="status-dot" />
            <strong>{connection === ConnectionState.Connected ? 'LIVE' : 'CONNECTING'}</strong>
          </span>
          <span className={`network-quality network-${networkQuality}`}>
            {networkQuality === ConnectionQuality.Excellent
              ? 'Network excellent'
              : networkQuality === ConnectionQuality.Good
                ? 'Network good'
                : networkQuality === ConnectionQuality.Poor
                  ? 'Network poor'
                  : networkQuality === ConnectionQuality.Lost
                    ? 'Network lost'
                    : 'Network checking'}
          </span>
          {reconnectAttempt > 0 && connection !== ConnectionState.Connected ? (
            <span className="participant-count">Retry {reconnectAttempt}/3</span>
          ) : null}
          <span className="participant-count">{participants.length} people</span>
          {license ? <span className="license-plan">{license.plan} - up to {license.maxResolution}</span> : null}
        </div>
        <div className="header-actions">
          {isTeacher && <button onClick={() => void copyJoinLink()}>Copy Join Link</button>}
          {isTeacher && <button onClick={exportAttendance}>Attendance CSV</button>}
          {isTeacher && (
            <select
              aria-label="Lighting scene"
              value={lighting}
              onChange={(event) => void setLight(event.target.value)}
              className="lk-light-select"
            >
              <option value="auto">Light: Auto</option>
              <option value="teaching">Light: Teaching</option>
              <option value="presentation">Light: Presentation</option>
              <option value="off">Light: Off</option>
            </select>
          )}
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? 'Light' : 'Dark'}</button>
          <button className="danger-ghost" onClick={leave}>Leave</button>
        </div>
        <div className="compact-header-tools">
          <button
            type="button"
            className="compact-tools-button"
            aria-label="Open Live Now tools"
            aria-expanded={studioMenuOpen}
            onClick={() => setStudioMenuOpen((open) => !open)}
          >
            <MoreHorizontal size={18} />
            <span>Tools</span>
          </button>
          {studioMenuOpen ? (
            <>
              <button className="compact-tools-scrim" aria-label="Close Live Now tools" onClick={() => setStudioMenuOpen(false)} />
              <div className="compact-tools-menu">
                {isTeacher && <button onClick={() => { void copyJoinLink(); setStudioMenuOpen(false); }}>Copy Join Link</button>}
                {isTeacher && <button onClick={() => { exportAttendance(); setStudioMenuOpen(false); }}>Attendance CSV</button>}
                {isTeacher && (
                  <label>
                    <span>Lighting</span>
                    <select
                      aria-label="Lighting scene"
                      value={lighting}
                      onChange={(event) => void setLight(event.target.value)}
                      className="lk-light-select"
                    >
                      <option value="auto">Auto</option>
                      <option value="teaching">Teaching</option>
                      <option value="presentation">Presentation</option>
                      <option value="off">Off</option>
                    </select>
                  </label>
                )}
                <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>Switch to {theme === 'dark' ? 'Light' : 'Dark'} theme</button>
                <button className="danger-ghost" onClick={leave}>Leave Class</button>
              </div>
            </>
          ) : null}
        </div>
      </header>

      <div className="live-body">
        <section className={`stage-column ${isTeacher ? 'teacher-studio-column' : 'student-stage-column'}`}>
          <div ref={stageRef} className={`main-stage mode-${presentation} studio-layout-${studio.layout}`}>
            <div className="stage-badge">
              {presentation === 'pdf'
                ? `PDF - ${pdfName || 'Presentation'}`
                : presentation === 'resource'
                  ? `FILE - ${activeResource?.title || 'Class material'}`
                  : presentation.toUpperCase()}
            </div>
            <button type="button" className="stage-fullscreen-button" onClick={toggleStageFullscreen} aria-label="Fullscreen stage"><Maximize2 size={18} /></button>
            {isTeacher && (
              <div className="stage-actions">
                {presentation !== 'camera' && <button type="button" onClick={toggleCamera}>Camera view</button>}
                {pdfUrl && presentation !== 'pdf' && <button type="button" onClick={resumePdf}>Resume PDF</button>}
                {presentation === 'pdf' && pdfUrl && (
                  <>
                    <button type="button" className={pdfAnnotate ? 'active' : ''} onClick={() => setPdfAnnotate((value) => !value)}>{pdfAnnotate ? 'Stop drawing' : 'Annotate'}</button>
                    <button type="button" onClick={() => fileInputRef.current?.click()}>Replace PDF</button>
                  </>
                )}
              </div>
            )}

            {presentation === 'pdf' ? (
              pdfUrl ? (
                <div className="presentation-layer">
                  <PdfDeck url={pdfUrl} page={pdfPage} canControl={isTeacher} onPageChange={changePdfPage} onPageCount={handlePdfPageCount} />
                  <Whiteboard strokes={pdfStrokes[String(pdfPage)] || []} canDraw={isTeacher && pdfAnnotate} transparent onStroke={addStroke} onClear={clearWhiteboard} />
                </div>
              ) : <div className="stage-empty"><strong>Waiting for PDF...</strong><span>The teacher&apos;s presentation will appear here.</span></div>
            ) : presentation === 'resource' ? (
              <PresentedResourceStage resource={activeResource} />
            ) : presentation === 'whiteboard' ? (
              <Whiteboard strokes={boardStrokes} canDraw={isTeacher} onStroke={addStroke} onClear={clearWhiteboard} />
            ) : presentation === 'screen' && screenParticipant ? (
              <VideoTile participant={screenParticipant} source={Track.Source.ScreenShare} stage />
            ) : (
              programCameraParticipant ? (
                <VideoTile
                  participant={programCameraParticipant}
                  publicationSid={programPublicationSid}
                  stage
                />
              ) : (
                <div className="stage-empty"><strong>Waiting for teacher camera...</strong><span>The teacher controls the program stage.</span></div>
              )
            )}

            {!localPipHidden && studio.pip.kind !== 'none' && (
              <div className={`studio-pip pip-${studio.pipPosition} ${studio.layout !== 'focus' ? 'pip-layout-panel' : ''}`}>
                {studio.pip.kind === 'pdf' && pdfUrl ? (
                  <PdfDeck url={pdfUrl} page={pdfPage} canControl={false} onPageChange={() => {}} />
                ) : studio.pip.kind === 'screen' && screenParticipant ? (
                  <VideoTile participant={screenParticipant} source={Track.Source.ScreenShare} stage />
                ) : studio.pip.kind === 'camera' ? (() => {
                  const pipCamera = studio.pip.kind === 'camera' ? studio.pip.camera : null;
                  if (!pipCamera) return null;
                  const participant = participants.find(
                    (p) => p.identity === pipCamera.participantIdentity
                  );
                  return participant ? (
                    <VideoTile participant={participant} publicationSid={pipCamera.trackSid} stage />
                  ) : null;
                })() : null}
              </div>
            )}

            {studio.vipIdentities.length > 0 && (
              <div className="studio-vips">
                {studio.vipIdentities.slice(0, 2).map((identity, index) => {
                  const participant = participants.find((p) => p.identity === identity);
                  return participant ? <div className="studio-vip" key={identity}><span>VIP {index + 1}</span><VideoTile participant={participant} /></div> : null;
                })}
              </div>
            )}

            {studio.watermark.enabled && (
              <div
                className={`live-now-watermark watermark-${studio.watermark.position}`}
                style={{ opacity: studio.watermark.opacity }}
              >{studio.watermark.text || 'Ibemhal IAS'}</div>
            )}

            {pdfProgress !== null && <div className="transfer-pill">Sending PDF {pdfProgress}%</div>}
          </div>

          {isTeacher && (
            <div className="live-now-studio-rack">
              <div className="studio-rack-sources">
                <div className="studio-rack-heading"><strong>Sources</strong><small>Teacher controls what students see</small></div>
                <div className="studio-source-strip">
                  {cameraSources.map(({ participant, ref }, index) => (
                    <div className={`studio-source-card ${studio.programCamera?.trackSid === ref.trackSid && presentation === 'camera' ? 'program-active' : ''}`} key={ref.trackSid}>
                      <VideoTile participant={participant} publicationSid={ref.trackSid} />
                      <div className="source-card-actions">
                        <button onClick={() => void setProgramCamera(ref)}>Program</button>
                        <button onClick={() => void setPipSource({ kind: 'camera', camera: ref })}>PIP</button>
                      </div>
                    </div>
                  ))}
                  {pdfUrl && (
                    <div className={`studio-source-card source-static ${presentation === 'pdf' ? 'program-active' : ''}`}>
                      <strong>PDF</strong><small>{pdfName || 'Presentation'}</small>
                      <div className="source-card-actions"><button onClick={() => void resumePdf()}>Program</button><button onClick={() => void setPipSource({ kind: 'pdf' })}>PIP</button></div>
                    </div>
                  )}
                  {screenParticipant && (
                    <div className={`studio-source-card source-static ${presentation === 'screen' ? 'program-active' : ''}`}>
                      <strong>SCREEN</strong><small>{screenParticipant.name || 'Screen Share'}</small>
                      <div className="source-card-actions"><button onClick={() => void broadcastPresentation('screen')}>Program</button><button onClick={() => void setPipSource({ kind: 'screen', participantIdentity: screenParticipant.identity })}>PIP</button></div>
                    </div>
                  )}
                  <button className="studio-add-source" onClick={() => { void loadDevices(); setCameraSourceOpen(true); }}>+ Add Camera</button>
                </div>
              </div>
              <div className="studio-next-preview">
                <div className="studio-rack-heading"><strong>Preview</strong><small>{pdfUrl ? `Next slide ${Math.min(pdfPage + 1, pdfTotalPages || pdfPage + 1)}` : 'No PDF loaded'}</small></div>
                <div className="next-slide-monitor">
                  {pdfUrl ? <PdfDeck url={pdfUrl} page={Math.min(pdfPage + 1, pdfTotalPages || pdfPage + 1)} canControl={false} onPageChange={() => {}} /> : <span>Preview monitor</span>}
                </div>
              </div>
            </div>
          )}

          <div className="control-bar" aria-label="Live Now controls">
            <button disabled={!canPublishMedia} className={lkRoom.localParticipant.isMicrophoneEnabled ? '' : 'off'} onClick={toggleMic}>
              <span className="control-icon"><Mic size={17} /></span>
              {lkRoom.localParticipant.isMicrophoneEnabled ? 'Mute' : canPublishMedia ? 'Unmute' : 'Mic locked'}
            </button>
            <button disabled={!canPublishMedia} className={lkRoom.localParticipant.isCameraEnabled && presentation === 'camera' ? 'active-control' : !lkRoom.localParticipant.isCameraEnabled ? 'off' : ''} onClick={toggleCamera}>
              <span className="control-icon"><Video size={17} /></span>
              {!canPublishMedia ? 'Camera locked' : presentation !== 'camera' && isTeacher ? 'Camera view' : lkRoom.localParticipant.isCameraEnabled ? 'Camera on' : 'Camera off'}
            </button>
            {canPublishMedia && <button onClick={switchCamera}><span className="control-icon"><RotateCw size={17} /></span>Flip</button>}
            {isTeacher && <button className={lkRoom.localParticipant.isScreenShareEnabled ? 'active-control' : ''} onClick={toggleScreen}><span className="control-icon"><ScreenShare size={17} /></span>Share</button>}
            {isTeacher && <button className={presentation === 'pdf' ? 'active-control' : ''} onClick={resumePdf}><span className="control-icon"><FileText size={17} /></span>{pdfUrl ? 'PDF' : 'Present'}</button>}
            {isTeacher && <button className={presentation === 'whiteboard' ? 'active-control' : ''} onClick={openWhiteboard}><span className="control-icon"><PenTool size={17} /></span>Board</button>}
            {!isTeacher && <button className={handRaised ? 'hand-active' : ''} onClick={toggleHand}><span className="control-icon"><Hand size={17} /></span>{handRaised ? 'Lower' : 'Raise hand'}</button>}
            {!isTeacher && studio.pip.kind !== 'none' && <button className={!localPipHidden ? 'active-control' : ''} onClick={() => setLocalPipHidden((value) => !value)}><span className="control-icon"><PictureInPicture2 size={17} /></span>PIP</button>}
            {isTeacher && studio.pip.kind !== 'none' && <button onClick={() => void cyclePipPosition()}><span className="control-icon"><PictureInPicture2 size={17} /></span>PIP {studio.pipPosition.replace('-', ' ')}</button>}
            {isTeacher && studio.pip.kind !== 'none' && <button onClick={() => void setPipSource({ kind: 'none' })}><span className="control-icon"><X size={17} /></span>PIP Off</button>}
            {isTeacher && <button onClick={() => void updateStudio({ layout: studio.layout === 'focus' ? 'side-by-side' : studio.layout === 'side-by-side' ? 'theater' : 'focus' })}><span className="control-icon"><LayoutGrid size={17} /></span>{studio.layout}</button>}
            <button onClick={toggleStageFullscreen}><span className="control-icon"><Maximize2 size={17} /></span>Fullscreen</button>
            {isTeacher && <button className={studio.watermark.enabled ? 'active-control' : ''} onClick={() => setWatermarkOpen(true)}><span className="control-icon"><Type size={17} /></span>Watermark</button>}
            {isTeacher && (
              <select className="quality-select" value={studio.quality} onChange={(event) => void applyQuality(event.target.value as QualityTier)} aria-label="Live Now video quality">
                <option value="720p">720p</option>
                <option value="1080p" disabled={resolutionRank(license?.maxResolution || '720p') < 2}>1080p</option>
                <option value="4k" disabled={resolutionRank(license?.maxResolution || '720p') < 3}>4K</option>
              </select>
            )}
            {isTeacher && <button className={recording ? 'recording' : ''} onClick={toggleRecording}><span className="control-icon"><Circle size={17} /></span>{recording ? 'Stop Rec' : 'Local Rec'}</button>}
            <button onClick={loadDevices}><span className="control-icon"><Settings size={17} /></span>Devices</button>
            <button className="mobile-panel-button" onClick={() => setMobilePanelOpen((open) => !open)}><span className="control-icon"><Menu size={17} /></span>People / Chat</button>
            <input ref={fileInputRef} hidden type="file" accept="application/pdf,.pdf" onChange={(e) => { const file = e.target.files?.[0]; e.currentTarget.value = ''; void choosePdf(file); }} />
            <input
              ref={resourceInputRef}
              hidden
              type="file"
              multiple
              onChange={(event) => {
                const files = Array.from(event.currentTarget.files || []) as File[];
                event.currentTarget.value = '';
                if (files.length) void uploadClassResources(files);
              }}
            />
          </div>
        </section>

        {mobilePanelOpen ? <button className="side-panel-scrim" aria-label="Close People and Chat panel" onClick={() => setMobilePanelOpen(false)} /> : null}
        <aside className={`side-panel ${mobilePanelOpen ? 'mobile-open' : ''}`} aria-label="Live Now People, Chat and tools">
          <div className="side-panel-head">
            <div className="side-tabs">
            <button className={`${sidebar === 'people' ? 'active ' : ''}${isTeacher && raisedParticipants.length ? 'hand-tab-alert' : ''}`} onClick={() => setSidebar('people')}>People <span>{participants.length}</span>{isTeacher && raisedParticipants.length ? <b className="hand-count-badge">{raisedParticipants.length}</b> : null}</button>
            <button className={sidebar === 'chat' ? 'active' : ''} onClick={() => setSidebar('chat')}>Chat</button>
            {isTeacher && <button className={`${sidebar === 'hands' ? 'active ' : ''}${raisedParticipants.length ? 'hand-tab-alert' : ''}`} onClick={() => setSidebar('hands')}>Raised Hands {raisedParticipants.length ? <b className="hand-count-badge">{raisedParticipants.length}</b> : null}</button>}
            <button className={sidebar === 'files' ? 'active' : ''} onClick={() => setSidebar('files')}>Files</button>
            <button className={sidebar === 'poll' ? 'active' : ''} onClick={() => setSidebar('poll')}>Poll</button>
            </div>
            <button type="button" className="side-panel-close" aria-label="Close panel" onClick={() => setMobilePanelOpen(false)}><X size={16} /></button>
          </div>

          {sidebar === 'people' && (
            <div className="people-list">
              {participants.map((participant) => (
                <div className="person-row" key={participant.identity}>
                  <div className="person-avatar">{(participant.name || participant.identity).slice(0, 2).toUpperCase()}</div>
                  <div className="person-meta"><strong>{participant.name || participant.identity}{participant.isLocal ? ' (You)' : ''}</strong><small>{participant.attributes?.role || (participant.isLocal ? role : 'participant')}</small></div>
                  {hands[participant.identity] && <span className="raised"><Hand size={15} /></span>}
                  <span
                    className={`participant-network network-${participant.connectionQuality || ConnectionQuality.Unknown}`}
                    title={`Network: ${participant.connectionQuality || 'checking'}`}
                    aria-label={`Network ${participant.connectionQuality || 'checking'}`}
                  />
                  <span className={participant.isMicrophoneEnabled ? 'audio-state on' : 'audio-state'} aria-label={participant.isMicrophoneEnabled ? 'Microphone on' : 'Microphone off'}><Mic size={13} /></span>
                  {isTeacher && !participant.isLocal && (
                    <div className="person-actions">
                      <button title="Pin participant as VIP 1" className={studio.vipIdentities[0] === participant.identity ? 'active' : ''} onClick={() => void toggleVip(participant.identity, 0)}>VIP1</button>
                      <button title="Pin participant as VIP 2" className={studio.vipIdentities[1] === participant.identity ? 'active' : ''} onClick={() => void toggleVip(participant.identity, 1)}>VIP2</button>
                      {hands[participant.identity] && <button title="Allow microphone and camera" onClick={() => moderate(participant, 'promote')}>Speaker</button>}
                      {hands[participant.identity] && <button title="Dismiss raised hand" onClick={() => dismissHand(participant)}>Dismiss</button>}
                      {(participant.attributes?.role === 'speaker') && <button title="Return to view-only student" onClick={() => moderate(participant, 'demote')}>Viewer</button>}
                      {participant.isMicrophoneEnabled && <button title="Mute microphone" onClick={() => moderate(participant, 'mute')}>Mute</button>}
                      <button title="Remove from room" onClick={() => moderate(participant, 'kick')}><X size={12} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {sidebar === 'hands' && isTeacher && (
            <div className="raised-hands-queue">
              <div className="raised-hands-title"><strong>Raised Hands ({raisedParticipants.length})</strong><small>First raised hand is shown first.</small></div>
              {raisedParticipants.length === 0 ? <div className="empty-side">No raised hands.</div> : raisedParticipants.map((participant, index) => (
                <div className="raised-hand-row" key={participant.identity}>
                  <span className="queue-number">{index + 1}</span>
                  <div><strong>{participant.name || participant.identity}</strong><small>Waiting to be called</small></div>
                  <button onClick={() => void moderate(participant, 'promote')}>Allow Mic</button>
                  <button onClick={() => void toggleVip(participant.identity, 0)}>VIP1</button>
                  <button onClick={() => void toggleVip(participant.identity, 1)}>VIP2</button>
                  <button className="danger-mini" onClick={() => void dismissHand(participant)}>Lower</button>
                </div>
              ))}
            </div>
          )}

          {sidebar === 'chat' && (
            <div className="lk-persistent-chat">
              <CommunityChat
                liveClassId={classId}
                compact
                adminMode={mode === "teacher"}
              />
            </div>
          )}

          {sidebar === 'files' && (
            <div className="lk-files-panel">
              <div className="lk-files-title-row">
                <div>
                  <strong>Class Materials</strong>
                  <small>Keep PDFs, images, audio, video and lesson files ready for this class.</small>
                </div>
                {isTeacher ? (
                  <button
                    type="button"
                    className="lk-file-upload-button"
                    onClick={() => resourceInputRef.current?.click()}
                    disabled={resourceUploading}
                    aria-label="Upload class materials"
                  >
                    <Plus size={16} />
                    <span>{resourceUploading ? 'Uploading' : 'Add files'}</span>
                  </button>
                ) : null}
              </div>

              {resourceUploading || resourceUploadStatus ? (
                <div className="lk-file-upload-status">
                  <span className="lk-upload-spinner" />
                  <span>{resourceUploadStatus || 'Uploading class materials...'}</span>
                </div>
              ) : null}

              {isTeacher ? (
                <button
                  type="button"
                  className="lk-file-dropzone"
                  onClick={() => resourceInputRef.current?.click()}
                  disabled={resourceUploading}
                >
                  <Plus size={22} />
                  <strong>Add presentation files</strong>
                  <span>Select several files at once. Up to 20 files per selection, 50 MB each.</span>
                </button>
              ) : null}

              {(liveClass?.resources || []).length === 0 ? (
                <div className="empty-side">No class materials uploaded yet.</div>
              ) : (
                <div className="lk-file-stack">
                  {(liveClass?.resources || []).map((resource: any) => {
                    const ResourceIcon = resourceIcon(String(resource.resource_type || 'file').toLowerCase());
                    const isActive =
                      (presentation === 'pdf' && String(resource.resource_type || '').toLowerCase() === 'pdf' && resource.title === pdfName) ||
                      (presentation === 'resource' && activeResource?.id === String(resource.id));
                    return (
                      <div className={`lk-file-row ${isActive ? 'active-resource' : ''}`} key={resource.id}>
                        <div className="lk-file-type-icon"><ResourceIcon size={17} /></div>
                        <div className="lk-file-meta">
                          <strong title={resource.title}>{resource.title}</strong>
                          <small>
                            {String(resource.resource_type || "file").toUpperCase()}
                            {resource.file_size ? ` - ${(Number(resource.file_size) / 1024 / 1024).toFixed(Number(resource.file_size) > 1024 * 1024 ? 1 : 2)} MB` : ''}
                          </small>
                        </div>
                        <div className="lk-file-actions">
                          {resource.url ? (
                            <a href={resource.url} target="_blank" rel="noreferrer" title="Open file"><Download size={14} /><span>Open</span></a>
                          ) : null}
                          {isTeacher && resource.url ? (
                            <button type="button" onClick={() => void presentStoredResource(resource)} title="Put this file on the live stage">
                              <ScreenShare size={14} /><span>Present</span>
                            </button>
                          ) : null}
                          {isTeacher ? (
                            <button type="button" className="danger-mini" onClick={() => void deleteClassResource(resource)} title="Remove file">
                              <Trash2 size={14} />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {sidebar === 'poll' && (
            <div className="poll-panel">
              {isTeacher && (
                <form className="poll-create" onSubmit={createPoll}>
                  <label>Quick poll<input value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} placeholder="Ask a question" /></label>
                  <input value={pollA} onChange={(e) => setPollA(e.target.value)} placeholder="Option 1" />
                  <input value={pollB} onChange={(e) => setPollB(e.target.value)} placeholder="Option 2" />
                  <button>Create / replace poll</button>
                </form>
              )}
              {poll ? (
                <div className="active-poll">
                  <p className="eyebrow">LIVE POLL</p><h3>{poll.question}</h3>
                  {poll.options.map((option, index) => (
                    <button key={option + index} className={myVote === index ? 'voted' : ''} onClick={() => vote(index)}>
                      <span>{option}</span>{isTeacher && <strong>{pollCounts[index] || 0}</strong>}
                    </button>
                  ))}
                  {!isTeacher && myVote !== null && <small>Your vote has been sent to the teacher.</small>}
                </div>
              ) : <div className="empty-side">{isTeacher ? 'Create a quick two-option poll above.' : 'No active poll.'}</div>}
            </div>
          )}
        </aside>
      </div>

      {watermarkOpen && isTeacher && (
        <div className="modal-backdrop" onMouseDown={() => setWatermarkOpen(false)}>
          <div className="settings-card watermark-settings" onMouseDown={(e) => e.stopPropagation()}>
            <div className="settings-title"><div><p className="eyebrow">PROGRAM</p><h2>Watermark</h2></div><button onClick={() => setWatermarkOpen(false)}><X size={16} /></button></div>
            <label className="watermark-toggle"><input type="checkbox" checked={studio.watermark.enabled} onChange={(e) => void updateStudio({ watermark: { ...studio.watermark, enabled: e.target.checked } })} /> Enable watermark</label>
            <label className="device-select">Watermark text<input value={studio.watermark.text} onChange={(e) => void updateStudio({ watermark: { ...studio.watermark, text: e.target.value } })} /></label>
            <div className="watermark-position-grid">
              {(['top-left','top-right','bottom-left','bottom-right'] as PipPosition[]).map((position) => <button key={position} className={studio.watermark.position === position ? 'active' : ''} onClick={() => void updateStudio({ watermark: { ...studio.watermark, position } })}>{position.replace('-', ' ')}</button>)}
            </div>
            <label className="device-select">Opacity<input type="range" min="0.15" max="0.9" step="0.05" value={studio.watermark.opacity} onChange={(e) => void updateStudio({ watermark: { ...studio.watermark, opacity: Number(e.target.value) } })} /></label>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="modal-backdrop" onMouseDown={() => setSettingsOpen(false)}>
          <div className="settings-card" onMouseDown={(e) => e.stopPropagation()}>
            <div className="settings-title"><div><p className="eyebrow">MEDIA</p><h2>Devices</h2></div><button onClick={() => setSettingsOpen(false)}><X size={16} /></button></div>
            <DeviceSelect label="Microphone" kind="audioinput" devices={devices} onChange={switchDevice} />
            <DeviceSelect label="Camera" kind="videoinput" devices={devices} onChange={switchDevice} />
            <DeviceSelect label="Speaker" kind="audiooutput" devices={devices} onChange={switchDevice} />
            {isTeacher && cameraSourceOpen && (
              <div className="extra-camera-section">
                <strong>Add simultaneous camera source</strong>
                <small>Publish a second or third physical camera without replacing the teacher camera.</small>
                {devices.filter((device) => device.kind === 'videoinput').map((device, index) => (
                  <button key={device.deviceId} type="button" onClick={() => void addCameraSource(device.deviceId)}>{device.label || `Camera ${index + 1}`}</button>
                ))}
              </div>
            )}
            <p className="settings-note">Speaker switching depends on browser support. Chrome/Edge provide the broadest support.</p>
          </div>
        </div>
      )}

      {notice && <div className="toast">{notice}</div>}
    </main>
  );
}

function DeviceSelect({
  label,
  kind,
  devices,
  onChange,
}: {
  label: string;
  kind: MediaDeviceKind;
  devices: MediaDeviceInfo[];
  onChange: (kind: MediaDeviceKind, id: string) => void;
}) {
  const filtered = devices.filter((d) => d.kind === kind);
  return (
    <label className="device-select">{label}
      <select defaultValue="" onChange={(e) => onChange(kind, e.target.value)}>
        <option value="" disabled>Select {label.toLowerCase()}</option>
        {filtered.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `${label} ${i + 1}`}</option>)}
      </select>
    </label>
  );
}
