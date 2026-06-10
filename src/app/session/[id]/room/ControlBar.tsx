"use client";

import { useEffect, useState } from "react";
import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { Track } from "livekit-client";
import AudioVisualizer from "./AudioVisualizer";
import {
  MicOnIcon,
  MicOffIcon,
  CamOnIcon,
  CamOffIcon,
  ScreenShareOffIcon,
  LeaveIcon,
  GridViewIcon,
  SpeakerViewIcon,
  CaptionsIcon,
  PeopleIcon,
  SpeakerIcon,
  SpeakerOffIcon,
} from "./icons";

function HandIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 11V6a2 2 0 0 0-4 0v1" />
      <path d="M14 10V4a2 2 0 0 0-4 0v2" />
      <path d="M10 10.5V6a2 2 0 0 0-4 0v4" />
      <path d="M18 8a2 2 0 0 1 4 0v6a8 8 0 0 1-8 8h-2a5 5 0 0 1-5-5v-3" />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function MoreVerticalIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
    </svg>
  );
}

function MonitorUpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="13" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="18" x2="12" y2="21" />
      <polyline points="8 11 12 15 16 11" />
    </svg>
  );
}

function LayoutGridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function CircleDotIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  );
}

function SettingsGearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 1.5v2" /><path d="M12 20.5v2" />
      <path d="M4.93 4.93l1.41 1.41" /><path d="M17.66 17.66l1.41 1.41" />
      <path d="M1.5 12h2" /><path d="M20.5 12h2" />
      <path d="M4.93 19.07l1.41-1.41" /><path d="M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

export default function ControlBar({
  onLeave,
  captionsOpen,
  onToggleCaptions,
  viewMode,
  onViewModeChange,
  participantListOpen,
  onToggleParticipantList,
  deviceSelectorOpen,
  onToggleDeviceSelector,
  speakerOn,
  onToggleSpeaker,
}: {
  onLeave: () => void;
  captionsOpen: boolean;
  onToggleCaptions: () => void;
  viewMode: "grid" | "speaker";
  onViewModeChange: (mode: "grid" | "speaker") => void;
  participantListOpen: boolean;
  onToggleParticipantList: () => void;
  deviceSelectorOpen: boolean;
  onToggleDeviceSelector: () => void;
  speakerOn: boolean;
  onToggleSpeaker: () => void;
}) {
  const { localParticipant, microphoneTrack, cameraTrack } = useLocalParticipant();
  const room = useRoomContext();
  const [screenSharing, setScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordInterval, setRecordInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  const micOn = !!microphoneTrack && !microphoneTrack.isMuted;
  const camOn = !!cameraTrack && cameraTrack.source === Track.Source.Camera && !cameraTrack.isMuted;

  // Track the local mic MediaStream for the audio visualizer
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  useEffect(() => {
    if (micOn && microphoneTrack?.track?.mediaStreamTrack) {
      try {
        const s = new MediaStream([microphoneTrack.track.mediaStreamTrack]);
        setMicStream(s);
      } catch { setMicStream(null); }
    } else {
      setMicStream(null);
    }
  }, [micOn, microphoneTrack]);

  async function toggleMic() { await localParticipant.setMicrophoneEnabled(!micOn); }
  async function toggleCam() { await localParticipant.setCameraEnabled(!camOn); }

  async function toggleScreenShare() {
    if (screenSharing) {
      for (const pub of localParticipant.videoTrackPublications.values()) {
        if (pub.source === Track.Source.ScreenShare) {
          await localParticipant.unpublishTrack(pub.track!.mediaStreamTrack);
        }
      }
      setScreenSharing(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const screenTrack = stream.getVideoTracks()[0];
        if (!screenTrack) return;
        screenTrack.onended = () => setScreenSharing(false);
        await localParticipant.publishTrack(screenTrack, { source: Track.Source.ScreenShare, simulcast: false });
        setScreenSharing(true);
      } catch { setScreenSharing(false); }
    }
  }

  async function leave() {
    if (screenSharing) { await toggleScreenShare(); }
    await room.disconnect();
    onLeave();
  }

  function toggleRecording() {
    if (isRecording) {
      if (recordInterval) clearInterval(recordInterval);
      setRecordInterval(null);
      setRecordSeconds(0);
      setIsRecording(false);
    } else {
      setRecordSeconds(0);
      setIsRecording(true);
      const interval = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
      setRecordInterval(interval);
    }
  }

  return (
    <footer className="control-dock">
      <div className="control-dock-inner">
        {/* Mic group */}
        <div className="dock-group">
          <button
            className={`dock-btn${micOn ? "" : " muted"}`}
            onClick={toggleMic}
            title={micOn ? "Mute" : "Unmute"}
          >
            {micOn ? <MicOnIcon /> : <MicOffIcon />}
          </button>
          <AudioVisualizer
            stream={micStream}
            height={20}
            width={28}
            barCount={4}
          />
          <button className="dock-chevron" title="Audio settings">
            <ChevronUpIcon />
          </button>
        </div>

        {/* Cam group */}
        <div className="dock-group">
          <button
            className={`dock-btn${camOn ? "" : " muted"}`}
            onClick={toggleCam}
            title={camOn ? "Camera off" : "Camera on"}
          >
            {camOn ? <CamOnIcon /> : <CamOffIcon />}
          </button>
          <button className="dock-chevron" title="Video settings">
            <ChevronUpIcon />
          </button>
        </div>

        <div className="dock-divider" />

        {/* Screen share */}
        <button
          className={`dock-btn${screenSharing ? " active" : ""}`}
          onClick={toggleScreenShare}
          title={screenSharing ? "Stop sharing" : "Share screen"}
        >
          {screenSharing ? <ScreenShareOffIcon /> : <MonitorUpIcon />}
        </button>

        {/* Hand raise */}
        <button
          className={`dock-btn${handRaised ? " active" : ""}`}
          onClick={() => setHandRaised(!handRaised)}
          title={handRaised ? "Lower hand" : "Raise hand"}
        >
          <HandIcon />
        </button>

        {/* Captions toggle */}
        <button
          className={`dock-btn${captionsOpen ? " active" : ""}`}
          onClick={onToggleCaptions}
          title="Captions"
        >
          <CaptionsIcon />
        </button>

        {/* Translation audio toggle (speaker) */}
        <button
          className={`dock-btn${speakerOn ? " active" : ""}`}
          onClick={onToggleSpeaker}
          title={speakerOn ? "Translation audio on" : "Translation audio off"}
        >
          {speakerOn ? <SpeakerIcon /> : <SpeakerOffIcon />}
        </button>

        {/* Participants toggle */}
        <button
          className={`dock-btn${participantListOpen ? " active" : ""}`}
          onClick={onToggleParticipantList}
          title="Participants"
        >
          <PeopleIcon />
        </button>

        {/* Layout toggle */}
        <button
          className="dock-btn"
          onClick={() => onViewModeChange(viewMode === "grid" ? "speaker" : "grid")}
          title={viewMode === "speaker" ? "Grid view" : "Speaker view"}
        >
          {viewMode === "speaker" ? <GridViewIcon /> : <SpeakerViewIcon />}
        </button>

        <div className="dock-divider" />

        {/* More */}
        <div style={{ position: "relative" }}>
          <button
            className="dock-btn"
            onClick={() => setMoreOpen(!moreOpen)}
            title="More options"
          >
            <MoreVerticalIcon />
          </button>

          {/* More menu popover */}
          <div className={`dock-more-menu${moreOpen ? " visible" : ""}`}>
            <button className="dock-menu-item" onClick={() => { toggleRecording(); setMoreOpen(false); }}>
              <CircleDotIcon />
              <span>{isRecording ? "Stop Recording" : "Start Recording"}</span>
            </button>
            <button className="dock-menu-item">
              <ShieldIcon />
              <span>Security Options</span>
            </button>
            <button className="dock-menu-item">
              <ImageIcon />
              <span>Virtual Backgrounds</span>
            </button>
            <div className="dock-menu-divider" />
            <button className="dock-menu-item" onClick={onToggleDeviceSelector}>
              <SettingsGearIcon />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* End call */}
        <button className="dock-end-btn" onClick={leave} title="Leave call">
          <LeaveIcon />
        </button>
      </div>
    </footer>
  );
}
