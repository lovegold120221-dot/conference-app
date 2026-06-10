"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useLocalParticipant,
  useRemoteParticipants,
  useRoomContext,
} from "@livekit/components-react";
import { ConnectionState, ParticipantKind, RoomEvent, Track } from "livekit-client";
import { PARTICIPANT_LANG_ATTR } from "@/lib/config";
import { getLanguageByCode } from "@/lib/languages";
import { useGeminiTranslation } from "@/lib/useGeminiTranslation";
import VideoGrid from "./VideoGrid";
import type { ViewMode } from "./VideoGrid";
import SelfView from "./SelfView";
import ControlBar from "./ControlBar";
import LanguagePill from "./LanguagePill";
import ChatSidebar from "./ChatSidebar";
import ParticipantsSidebar from "./ParticipantsSidebar";
import DeviceSelector from "./DeviceSelector";
import ScreenShareTile from "./ScreenShareTile";

// ── Inline SVG icons ──

function ShieldCheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
    </svg>
  );
}

export default function InCall({
  initialLang,
  onLeave,
  isHost: initialIsHost,
}: {
  initialLang: string;
  onLeave: () => void;
  isHost: boolean;
}) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const remotes = useRemoteParticipants();
  const [lang, setLang] = useState(initialLang);
  const [captionsOpen, setCaptionsOpen] = useState(true);
  const [participantListOpen, setParticipantListOpen] = useState(false);
  const [deviceSelectorOpen, setDeviceSelectorOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [isHost, setIsHost] = useState(initialIsHost);
  const [audioInputId, setAudioInputId] = useState<string>("");
  const [audioOutputId, setAudioOutputId] = useState<string>("");
  const [videoInputId, setVideoInputId] = useState<string>("");

  // Read translation audio preference from sessionStorage (set in prejoin page)
  const [speakerOn] = useState(() => {
    if (typeof window === "undefined") return true;
    const v = window.sessionStorage.getItem("lt.speaker");
    return v === null || v === "1";
  });

  const myIdentity = localParticipant?.identity || "";

  // Track the local mic MediaStream for the audio visualizer
  const [micStream, setMicStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (!localParticipant) { setMicStream(null); return; }
    const pub = localParticipant.getTrackPublication(Track.Source.Microphone);
    const track = pub?.track;
    if (track && !pub?.isMuted && track.mediaStream) {
      setMicStream(track.mediaStream);
    } else {
      setMicStream(null);
    }
    // Listen for changes
    const update = () => {
      const p = localParticipant.getTrackPublication(Track.Source.Microphone);
      const t = p?.track;
      if (t && !p?.isMuted && t.mediaStream) {
        setMicStream(t.mediaStream);
      } else {
        setMicStream(null);
      }
    };
    localParticipant.on("trackPublished", update);
    localParticipant.on("trackUnpublished", update);
    localParticipant.audioTrackPublications.forEach((pub) => {
      pub.on("muted", update);
      pub.on("unmuted", update);
    });
    return () => {
      localParticipant.off("trackPublished", update);
      localParticipant.off("trackUnpublished", update);
    };
  }, [localParticipant]);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordInterval, setRecordInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  // Auto-detect devices
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const audioIn = devices.find((d) => d.kind === "audioinput");
      const audioOut = devices.find((d) => d.kind === "audiooutput");
      const videoIn = devices.find((d) => d.kind === "videoinput");
      if (audioIn) setAudioInputId(audioIn.deviceId);
      if (audioOut) setAudioOutputId(audioOut.deviceId);
      if (videoIn) setVideoInputId(videoIn.deviceId);
    });
  }, []);

  // Push language attribute
  useEffect(() => {
    if (!localParticipant || !room) return;
    const apply = () => {
      if (room.state === ConnectionState.Connected) {
        localParticipant.setAttributes({ [PARTICIPANT_LANG_ATTR]: lang });
      }
    };
    apply();
    room.on(RoomEvent.Connected, apply);
    return () => { room.off(RoomEvent.Connected, apply); };
  }, [room, localParticipant, lang]);

  // Detect host role
  useEffect(() => {
    if (!room || !localParticipant) return;
    const checkRole = () => {
      try {
        const meta = localParticipant.metadata;
        if (meta) {
          const parsed = JSON.parse(meta);
          if (parsed.role === "host") setIsHost(true);
        }
      } catch {}
    };
    checkRole();
    const handler = () => checkRole();
    room.on(RoomEvent.ParticipantMetadataChanged, handler);
    return () => { room.off(RoomEvent.ParticipantMetadataChanged, handler); };
  }, [room, localParticipant]);

  const { status: txStatus, captions: txCaptions, addExternalCaption } =
    useGeminiTranslation(lang, { playbackMuted: !speakerOn });

  const humanRemotes = useMemo(
    () => remotes.filter((p) => p.kind !== ParticipantKind.AGENT),
    [remotes],
  );

  const peerLangs = useMemo(() => {
    const map = new Map<string, string | undefined>();
    for (const p of humanRemotes) {
      map.set(p.identity, p.attributes?.[PARTICIPANT_LANG_ATTR]);
    }
    return map;
  }, [humanRemotes]);

  const langInfo = getLanguageByCode(lang);
  const inviteUrl = typeof window !== "undefined"
    ? `${window.location.origin}/session/${room.name}`
    : "";

  // Recording toggle
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      if (recordInterval) clearInterval(recordInterval);
      setRecordInterval(null);
      setIsRecording(false);
    } else {
      setRecordSeconds(0);
      setIsRecording(true);
    }
  }, [isRecording, recordInterval]);

  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      setRecordSeconds((s) => s + 1);
    }, 1000);
    setRecordInterval(interval);
    return () => clearInterval(interval);
  }, [isRecording]);

  const recMins = Math.floor(recordSeconds / 60).toString().padStart(2, "0");
  const recSecs = (recordSeconds % 60).toString().padStart(2, "0");

  const handleAudioInputChange = useCallback((deviceId: string) => {
    setAudioInputId(deviceId);
    localParticipant?.setMicrophoneEnabled(false).then(() => {
      localParticipant?.setMicrophoneEnabled(true);
    });
  }, [localParticipant]);

  const handleAudioOutputChange = useCallback((deviceId: string) => {
    setAudioOutputId(deviceId);
    document.querySelectorAll("audio, video").forEach((el) => {
      if ("setSinkId" in el) {
        (el as any).setSinkId(deviceId).catch(() => {});
      }
    });
  }, []);

  const handleVideoInputChange = useCallback((deviceId: string) => {
    setVideoInputId(deviceId);
    localParticipant?.setCameraEnabled(false).then(() => {
      localParticipant?.setCameraEnabled(true);
    });
  }, [localParticipant]);

  const myInitial = localParticipant?.name?.slice(0, 1).toUpperCase() || "U";

  return (
    <div className="meeting">
      {/* ── LEFT SIDEBAR: Chat / Polls / Captions ── */}
      <ChatSidebar
        open={captionsOpen}
        onClose={() => setCaptionsOpen(false)}
        myLang={lang}
        peerLangs={peerLangs}
        hookCaptions={txCaptions}
      />

      {/* ── CENTER STAGE ── */}
      <main className="stage">
        {/* Stage Header */}
        <header className="stage-header">
          <div className="stage-header-left">
            <div className="stage-brand">
              <div className="stage-logo">
                <div className="stage-logo-ring" />
                <div className="stage-logo-dot" />
              </div>
              <span className="stage-brand-text">Orbit</span>
            </div>
            <div className="stage-divider" />
            <div className="stage-meta">
              <span className="stage-room-name">
                {room.name.replace(/-/g, " ")}
              </span>
              <LanguagePill value={lang} onChange={setLang} />
              <div className="stage-e2ee-badge" title="End-to-End Encrypted">
                <span className="stage-e2ee-icon"><ShieldCheckIcon /></span>
                <span className="stage-e2ee-text">E2EE</span>
              </div>
              <div className={`recording-badge${isRecording ? " visible" : ""}`}>
                <div className="recording-dot animate-record-pulse" />
                <span className="recording-label">REC</span>
                <span className="recording-timer">{recMins}:{recSecs}</span>
              </div>
            </div>
          </div>

          {/* Floating PIP (Self View) */}
          <div className="stage-pip">
            <div className="stage-pip-video">
              <div className="stage-pip-avatar">{myInitial}</div>
            </div>
            <div className="stage-pip-overlay">
              <button className="stage-pip-pin" title="Pin">
                <PinIcon />
              </button>
              <div className="stage-pip-footer">
                <span className="stage-pip-name">
                  {localParticipant?.name || "You"} (me)
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Stage Center — Active Speaker */}
        <div className="stage-center">
          {humanRemotes.length === 0 ? (
            <div style={{ textAlign: "center", pointerEvents: "auto" }}>
              <div className="stage-center-wrap" style={{ marginBottom: 24 }}>
                <div className="stage-ping-ring" />
                <div className="stage-speaker-avatar">
                  <span className="stage-speaker-initials">{myInitial}</span>
                </div>
              </div>
              <p style={{ color: "var(--fg-tertiary)", fontSize: 13 }}>Waiting for others to join...</p>
            </div>
          ) : (
            <div className="stage-video-grid">
              <VideoGrid
                participants={humanRemotes}
                myLang={lang}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            </div>
          )}
          <SelfView micStream={micStream} />
        </div>

        {/* Control Dock */}
        <ControlBar
          onLeave={onLeave}
          captionsOpen={captionsOpen}
          onToggleCaptions={() => setCaptionsOpen((v) => !v)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          participantListOpen={participantListOpen}
          onToggleParticipantList={() => setParticipantListOpen((v) => !v)}
          deviceSelectorOpen={deviceSelectorOpen}
          onToggleDeviceSelector={() => setDeviceSelectorOpen((v) => !v)}
        />
      </main>

      {/* ── RIGHT SIDEBAR: Participants ── */}
      <ParticipantsSidebar
        open={participantListOpen}
        onClose={() => setParticipantListOpen(false)}
        inviteUrl={inviteUrl}
      />

      {/* Device selector overlay */}
      {deviceSelectorOpen && (
        <div className="device-selector-overlay">
          <DeviceSelector
            audioInputId={audioInputId}
            audioOutputId={audioOutputId}
            videoInputId={videoInputId}
            onAudioInputChange={handleAudioInputChange}
            onAudioOutputChange={handleAudioOutputChange}
            onVideoInputChange={handleVideoInputChange}
            onClose={() => setDeviceSelectorOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
