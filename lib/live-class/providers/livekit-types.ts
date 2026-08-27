export type UserRole = 'teacher' | 'cohost' | 'speaker' | 'student';
export type PresentationMode = 'camera' | 'screen' | 'pdf' | 'whiteboard' | 'resource';
export type DrawingSurface = 'board' | 'pdf';
export type StudioLayout = 'focus' | 'side-by-side' | 'theater';
export type PipPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type WatermarkPosition = PipPosition;
export type QualityTier = '720p' | '1080p' | '4k';

export type CameraSourceRef = {
  participantIdentity: string;
  trackSid: string;
  label?: string;
};

export type PipSource =
  | { kind: 'none' }
  | { kind: 'pdf' }
  | { kind: 'screen'; participantIdentity?: string }
  | { kind: 'camera'; camera: CameraSourceRef };

export type WatermarkConfig = {
  enabled: boolean;
  text: string;
  position: WatermarkPosition;
  opacity: number;
};

export type StudioConfig = {
  layout: StudioLayout;
  programCamera: CameraSourceRef | null;
  pip: PipSource;
  pipPosition: PipPosition;
  vipIdentities: string[];
  watermark: WatermarkConfig;
  quality: QualityTier;
};

export type PresentedResource = {
  id: string;
  title: string;
  url: string;
  resourceType: string;
  mimeType: string;
};

export type ChatMessage = {
  id: string;
  sender: string;
  text: string;
  at: number;
};

export type Point = { x: number; y: number };
export type Stroke = {
  id: string;
  points: Point[];
  width: number;
  color: string;
};

export type PollState = {
  id: string;
  question: string;
  options: string[];
  votes: Record<string, number>;
};

export type ClassroomSnapshot = {
  presentation: PresentationMode;
  pdfName: string;
  pdfPage: number;
  boardStrokes: Stroke[];
  pdfStrokes: Record<string, Stroke[]>;
  poll: Omit<PollState, 'votes'> | null;
  studio?: StudioConfig;
  activeResource?: PresentedResource | null;
  pdfUrl?: string;
};

export type ControlMessage =
  | { type: 'presentation'; mode: PresentationMode }
  | { type: 'studio-config'; studio: StudioConfig }
  | { type: 'state-sync'; snapshot: ClassroomSnapshot }
  | { type: 'pdf-meta'; name: string; page: number }
  | { type: 'pdf-url'; name: string; url: string; page: number }
  | { type: 'resource-present'; resource: PresentedResource }
  | { type: 'pdf-page'; page: number }
  | { type: 'whiteboard-stroke'; surface: DrawingSurface; page?: number; stroke: Stroke }
  | { type: 'whiteboard-clear'; surface: DrawingSurface; page?: number }
  | { type: 'hand'; raised: boolean; raisedAt?: number }
  | { type: 'hand-dismiss' }
  | { type: 'poll-new'; poll: Omit<PollState, 'votes'> }
  | { type: 'poll-vote'; pollId: string; option: number }
  | { type: 'poll-counts'; pollId: string; votes: Record<string, number> };
