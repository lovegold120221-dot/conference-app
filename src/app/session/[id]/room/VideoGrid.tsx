"use client";

import { useEffect, useMemo, useState } from "react";
import type { RemoteParticipant } from "livekit-client";
import ParticipantTile from "./ParticipantTile";

export type ViewMode = "grid" | "speaker";

export default function VideoGrid({
  participants,
  myLang,
  viewMode,
  onViewModeChange,
}: {
  participants: RemoteParticipant[];
  myLang: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}) {
  if (viewMode === "speaker" && participants.length > 1) {
    return (
      <SpeakerView
        participants={participants}
        myLang={myLang}
        onViewModeChange={onViewModeChange}
      />
    );
  }

  return (
    <GridView
      participants={participants}
      myLang={myLang}
      onViewModeChange={onViewModeChange}
    />
  );
}

/* ─── Grid View ─────────────────────────────────── */

function GridView({
  participants,
  myLang,
  onViewModeChange,
}: {
  participants: RemoteParticipant[];
  myLang: string;
  onViewModeChange: (mode: ViewMode) => void;
}) {
  const layout = useMemo(
    () => deriveLayout(participants.length),
    [participants.length],
  );

  return (
    <div className="view-layout">
      {participants.length > 1 && (
        <div className="view-toggle-bar">
          <button
            className="view-toggle-btn"
            onClick={() => onViewModeChange("speaker")}
            title="Speaker view"
            aria-label="Switch to speaker view"
          >
            <SpeakerViewIcon /> Speaker
          </button>
        </div>
      )}
      <div
        className="tile-grid"
        style={{
          gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
          maxWidth: layout.maxWidth,
        }}
      >
        {participants.map((p) => (
          <ParticipantTile key={p.identity} participant={p} myLang={myLang} />
        ))}
      </div>
    </div>
  );
}

/* ─── Speaker View ──────────────────────────────── */

function SpeakerView({
  participants,
  myLang,
  onViewModeChange,
}: {
  participants: RemoteParticipant[];
  myLang: string;
  onViewModeChange: (mode: ViewMode) => void;
}) {
  const [activeSpeakerId, setActiveSpeakerId] = useState<string>(
    participants[0]?.identity ?? "",
  );

  // Track the current speaker based on participant.isSpeaking
  // This is refreshed when participants change
  useEffect(() => {
    if (!activeSpeakerId && participants.length > 0) {
      setActiveSpeakerId(participants[0].identity);
    }
  }, [participants, activeSpeakerId]);

  const speaker =
    participants.find((p) => p.identity === activeSpeakerId) ?? participants[0];
  const others = participants.filter((p) => p.identity !== speaker.identity);

  return (
    <div className="view-layout speaker-layout">
      <div className="view-toggle-bar">
        <button
          className="view-toggle-btn"
          onClick={() => onViewModeChange("grid")}
          title="Grid view"
          aria-label="Switch to grid view"
        >
          <GridViewIcon /> Grid
        </button>
      </div>

      <div className="speaker-stage">
        <ParticipantTile
          key={speaker.identity}
          participant={speaker}
          myLang={myLang}
          isSpeakerView
        />
      </div>

      {others.length > 0 && (
        <div
          className="speaker-thumbnails"
          style={{
            gridTemplateColumns: `repeat(${Math.min(others.length, 4)}, minmax(0, 1fr))`,
          }}
        >
          {others.map((p) => (
            <ParticipantTile
              key={p.identity}
              participant={p}
              myLang={myLang}
              isThumbnail
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Layout helpers ────────────────────────────── */

function deriveLayout(n: number): { cols: number; maxWidth: string } {
  if (n <= 1) return { cols: 1, maxWidth: "min(900px, 80vw)" };
  if (n <= 2) return { cols: 2, maxWidth: "min(1400px, 92vw)" };
  if (n <= 4) return { cols: 2, maxWidth: "min(1200px, 92vw)" };
  if (n <= 6) return { cols: 3, maxWidth: "min(1400px, 96vw)" };
  if (n <= 9) return { cols: 3, maxWidth: "min(1600px, 96vw)" };
  return { cols: 4, maxWidth: "min(1700px, 96vw)" };
}

/* ─── Inline SVG icons (no deps on icons.tsx) ───── */

function SpeakerViewIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="12" rx="2" />
      <rect x="3" y="18" width="7" height="4" rx="1" />
      <rect x="14" y="18" width="7" height="4" rx="1" />
    </svg>
  );
}

function GridViewIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
