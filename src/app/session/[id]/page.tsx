"use client";

import { use, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PICKER_LANGUAGES } from "@/lib/languages";

const STORAGE_KEY_NAME = "lt.displayName";
const STORAGE_KEY_LANG = "lt.lang";

const BG_TEMPLATES = [
  { id: "none",    label: "None",     bg: "linear-gradient(135deg, #140e0c 0%, #2b201b 100%)" },
  { id: "blur",    label: "Blur",     bg: "linear-gradient(180deg, #0f0a08 0%, #1a100c 50%, #0f0a08 100%)" },
  { id: "gradient",label: "Gradient", bg: "linear-gradient(135deg, #1a0f0a 0%, #4a3020 50%, #2b201b 100%)" },
  { id: "office",  label: "Office",   bg: "linear-gradient(135deg, #3d2e1e 0%, #5a4530 50%, #3d2e1e 100%)" },
  { id: "nature",  label: "Nature",   bg: "linear-gradient(135deg, #1a2e1a 0%, #2d4a2d 50%, #1a2e1a 100%)" },
  { id: "city",    label: "City",     bg: "linear-gradient(135deg, #1a1a2e 0%, #2d3a5a 50%, #1a1a2e 100%)" },
];

function FlipIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}

export default function PreFlightPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [lang, setLang] = useState<string>("en");
  const [shareCopied, setShareCopied] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [mirrored, setMirrored] = useState(false);
  const [bgTemplate, setBgTemplate] = useState("none");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedName = window.sessionStorage.getItem(STORAGE_KEY_NAME);
    const savedLang = window.sessionStorage.getItem(STORAGE_KEY_LANG);
    if (savedName) setDisplayName(savedName);
    if (savedLang) setLang(savedLang);
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const toggleCamera = useCallback(async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().filter((t) => t.kind === "video").forEach((t) => t.stop());
      // Keep audio track if mic is on
      const audioTracks = streamRef.current.getTracks().filter((t) => t.kind === "audio");
      if (audioTracks.length === 0) {
        streamRef.current = null;
      } else {
        // Remove video track from the stream
        streamRef.current = new MediaStream(audioTracks);
      }
      // Clear video element so it doesn't show a frozen frame
      if (videoRef.current) videoRef.current.srcObject = null;
      setCameraOn(false);
    } else {
      try {
        const constraints: MediaStreamConstraints = { video: true };
        if (micOn) {
          constraints.audio = true;
        }
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraOn(true);
      } catch {
        // permission denied or no camera
      }
    }
  }, [micOn]);

  const toggleMic = useCallback(async () => {
    if (micOn) {
      streamRef.current?.getTracks().filter((t) => t.kind === "audio").forEach((t) => t.stop());
      setMicOn(false);
    } else {
      try {
        // If camera already on, add audio to existing stream
        if (streamRef.current) {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioStream.getAudioTracks().forEach((t) => streamRef.current!.addTrack(t));
          setMicOn(true);
        } else {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = stream;
          setMicOn(true);
        }
      } catch {
        // permission denied
      }
    }
  }, [micOn]);

  function handleJoin() {
    if (!displayName.trim()) return;
    // Stop camera/mic before navigating so they're released
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    window.sessionStorage.setItem(STORAGE_KEY_NAME, displayName.trim());
    window.sessionStorage.setItem(STORAGE_KEY_LANG, lang);
    router.push(`/session/${id}/room`);
  }

  async function copyInviteLink() {
    const url = `${window.location.origin}/session/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // ignored
    }
  }

  const initials = displayName
    ? displayName
        .split(" ")
        .map((s) => s[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className="prejoin">
      {/* Header */}
      <div className="prejoin-header">
        <div className="prejoin-logo">
          <div className="prejoin-logo-ring" />
          <div className="prejoin-logo-dot" />
        </div>
        <span className="prejoin-brand">Orbit Conference</span>
      </div>

      {/* Main 2-column layout */}
      <div className="prejoin-main">
        {/* Left: Camera Preview */}
        <div className="prejoin-preview">
          {/* Preview background layer (for templates) */}
          <div
            className={`prejoin-preview-bg ${bgTemplate === "blur" ? "prejoin-preview-bg-blur" : ""}`}
            style={
              bgTemplate === "blur"
                ? undefined
                : { background: BG_TEMPLATES.find((t) => t.id === bgTemplate)?.bg }
            }
          />
          <div className="prejoin-preview-badge">Camera Preview</div>

          {/* Mirror toggle */}
          <button
            className={`prejoin-mirror-btn${mirrored ? " active" : ""}`}
            onClick={() => setMirrored((v) => !v)}
            title="Mirror camera"
            aria-label="Toggle mirror"
          >
            <FlipIcon />
          </button>

          {/* Preview body */}
          <div className="prejoin-preview-body">
            {cameraOn || micOn ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className={mirrored ? "prejoin-video-mirrored" : ""}
                  style={{ display: cameraOn ? "block" : "none" }}
                />
                {/* Show avatar fallback when only mic is on */}
                {!cameraOn && (
                  <div className="prejoin-avatar-placeholder">{initials}</div>
                )}
              </>
            ) : (
              <div className="prejoin-avatar-placeholder">{initials}</div>
            )}
          </div>

          {/* BG Templates */}
          <div className="prejoin-bg-templates">
            {BG_TEMPLATES.map((t) => (
              <button
                key={t.id}
                className={`prejoin-bg-thumb${bgTemplate === t.id ? " active" : ""}`}
                onClick={() => setBgTemplate(t.id)}
                title={t.label}
                aria-label={t.label}
              >
                <span
                  className="prejoin-bg-thumb-swatch"
                  style={{
                    background: t.id === "blur"
                      ? "linear-gradient(180deg, #0f0a08 0%, #1a100c 50%, #0f0a08 100%)"
                      : t.bg,
                  }}
                />
                {t.id === "blur" && (
                  <span className="prejoin-bg-thumb-blur-overlay" />
                )}
                <span className="prejoin-bg-thumb-label">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Device dock */}
          <div className="prejoin-device-dock">
            <button
              className={`prejoin-device-btn${micOn ? " active" : ""}`}
              onClick={toggleMic}
              title="Mic"
              aria-label="Toggle microphone"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
            <button
              className={`prejoin-device-btn${cameraOn ? " active" : ""}`}
              onClick={toggleCamera}
              title="Camera"
              aria-label="Toggle camera"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right: Settings */}
        <div className="prejoin-settings">
          <h1 className="prejoin-title">Join the call</h1>
          <p className="prejoin-subtitle">
            Pick the language you want to hear &mdash; everyone else&rsquo;s
            speech gets translated into it live.
          </p>

          <div className="prejoin-field">
            <label className="prejoin-field-label">
              <span className="prejoin-field-label-icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Your name
              </span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Jesse"
              autoFocus
              className="prejoin-input"
              maxLength={40}
            />
          </div>

          <div className="prejoin-field">
            <label className="prejoin-field-label">
              <span className="prejoin-field-label-icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                I listen in
              </span>
            </label>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="prejoin-input"
              style={{ cursor: "pointer" }}
            >
              {PICKER_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 28 }}>
            <button
              className="prejoin-enter-btn"
              onClick={handleJoin}
              disabled={!displayName.trim()}
              id="join-btn"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Join the call
            </button>
            <button
              className="prejoin-enter-btn"
              onClick={copyInviteLink}
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "#e7e5e4",
                border: "1px solid var(--border)",
                boxShadow: "none",
                fontWeight: 500,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.14)";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                e.currentTarget.style.color = "#e7e5e4";
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              {shareCopied ? "Link copied!" : "Copy invite link"}
            </button>
          </div>

          <p
            className="mono"
            style={{ marginTop: 24, textAlign: "center", fontSize: 11 }}
          >
            Camera and mic stay off until you turn them on.
          </p>
        </div>
      </div>
    </div>
  );
}
