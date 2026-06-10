"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PICKER_LANGUAGES } from "@/lib/languages";

const STORAGE_KEY_NAME = "lt.displayName";
const STORAGE_KEY_LANG = "lt.lang";

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedName = window.sessionStorage.getItem(STORAGE_KEY_NAME);
    const savedLang = window.sessionStorage.getItem(STORAGE_KEY_LANG);
    if (savedName) setDisplayName(savedName);
    if (savedLang) setLang(savedLang);
  }, []);

  function handleJoin() {
    if (!displayName.trim()) return;
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
          <div className="prejoin-preview-badge">Camera Preview</div>
          <div className="prejoin-preview-body">
            <div className="prejoin-avatar-placeholder">{initials}</div>
          </div>
          <div className="prejoin-device-dock">
            {[
              { label: "Mic", icon: "mic" },
              { label: "Camera", icon: "camera" },
            ].map((dev) => (
              <button
                key={dev.label}
                className="prejoin-device-btn active"
                title={dev.label}
                aria-label={dev.label}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {dev.icon === "mic" ? (
                    <>
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </>
                  ) : (
                    <>
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </>
                  )}
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Settings */}
        <div className="prejoin-settings">
          <h1 className="prejoin-title">Join the call</h1>
          <p className="prejoin-subtitle">
            Pick your language &mdash; that&rsquo;s what you&rsquo;ll speak and
            what you&rsquo;ll hear everyone else in.
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
                Language
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
