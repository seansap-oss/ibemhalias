'use client';

import { useEffect, useRef } from 'react';
import { Participant, Track } from 'livekit-client';

export function VideoTile({
  participant,
  source = Track.Source.Camera,
  stage = false,
  publicationSid,
}: {
  participant: Participant;
  source?: Track.Source;
  stage?: boolean;
  publicationSid?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const publication = publicationSid
    ? participant.trackPublications.get(publicationSid)
    : participant.getTrackPublication(source);
  const track = publication?.track;

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !track) return;
    track.attach(element);
    return () => {
      track.detach(element);
    };
  }, [track]);

  const name = participant.name || participant.identity;
  const initials = name.slice(0, 2).toUpperCase();
  const isScreen = source === Track.Source.ScreenShare;

  return (
    <div className={`video-tile ${stage ? 'stage-video' : ''}`}>
      {track && !publication?.isMuted ? (
        <video ref={videoRef} autoPlay playsInline muted={participant.isLocal} />
      ) : (
        <div className="avatar-fallback"><span>{isScreen ? 'SCREEN' : initials}</span></div>
      )}
      <div className="video-label">
        <span>{name}{participant.isLocal ? ' (You)' : ''}</span>
        {!isScreen && <span className={participant.isMicrophoneEnabled ? 'mic-dot on' : 'mic-dot'}>{participant.isMicrophoneEnabled ? '●' : '×'}</span>}
      </div>
    </div>
  );
}

export function RemoteAudio({ participants }: { participants: Participant[] }) {
  return (
    <div className="audio-sinks" aria-hidden="true">
      {participants.filter((p) => !p.isLocal).map((participant) => (
        <AudioTrack key={participant.identity} participant={participant} />
      ))}
    </div>
  );
}

function AudioTrack({ participant }: { participant: Participant }) {
  const ref = useRef<HTMLAudioElement>(null);
  const publication = participant.getTrackPublication(Track.Source.Microphone);
  const track = publication?.track;

  useEffect(() => {
    const el = ref.current;
    if (!el || !track) return;
    track.attach(el);
    return () => { track.detach(el); };
  }, [track]);

  return <audio ref={ref} autoPlay />;
}
