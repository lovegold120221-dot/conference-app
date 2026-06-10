"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function createSession() {
    setLoading(true);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("lt.isHost", "true");
    }
    const sessionId = crypto.randomUUID();
    router.push(`/session/${sessionId}`);
  }

  return (
    <div className="page">
      <div className="container" style={{ textAlign: "center" }}>
        {/* Logo */}
        <div className="enter" style={{ marginBottom: 24 }}>
          <div
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              borderRadius: "50%",
              border: "1px solid var(--border-strong)",
              background: "rgba(43,32,27,0.5)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "1px dashed var(--accent)",
                animation: "spin 20s linear infinite",
              }}
            />
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--accent)",
              }}
            />
          </div>
        </div>

        {/* Eyebrow */}
        <p
          className="mono enter-d1"
          style={{ marginBottom: 12, fontSize: 11, letterSpacing: "0.12em" }}
        >
          Powered by Eburon AI
        </p>

        {/* Title */}
        <h1 className="display display-xl enter-d2" style={{ marginBottom: 16 }}>
          Orbit Conference
        </h1>

        {/* Subtitle */}
        <p
          className="body enter-d2"
          style={{ maxWidth: 360, margin: "0 auto 36px", fontSize: 15 }}
        >
          Multi-language video conferencing with real-time AI translation.
          Everyone speaks their language, everyone hears theirs.
        </p>

        {/* CTA */}
        <div className="enter-d3">
          <button
            className="btn btn-dark"
            onClick={createSession}
            disabled={loading}
            id="create-session-btn"
            style={{ padding: "16px 44px", fontSize: 14 }}
          >
            {loading ? (
              <>
                <span className="spinner" /> Creating&hellip;
              </>
            ) : (
              "Start a conference"
            )}
          </button>
        </div>

        {/* Steps */}
        <div
          className="enter-d4"
          style={{
            marginTop: 64,
            display: "flex",
            flexDirection: "column",
            gap: 0,
            textAlign: "left",
          }}
        >
          <hr className="rule" />
          {[
            { step: "01", text: "Pick your language and turn on your camera" },
            { step: "02", text: "Share the link with everyone joining the call" },
            {
              step: "03",
              text: "Each language pair spins up one AI translation session on demand",
            },
          ].map((item, i) => (
            <div key={i}>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  padding: "20px 0",
                  alignItems: "flex-start",
                }}
              >
                <span
                  className="mono"
                  style={{
                    flexShrink: 0,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--fg-tertiary)",
                    letterSpacing: "0.06em",
                    marginTop: 3,
                  }}
                >
                  {item.step}
                </span>
                <p
                  className="body"
                  style={{
                    color: "var(--fg-secondary)",
                    fontSize: 14,
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  {item.text}
                </p>
              </div>
              <hr className="rule" />
            </div>
          ))}
        </div>

        {/* Footer */}
        <p
          className="mono"
          style={{ marginTop: 48, fontSize: 11, letterSpacing: "0.06em" }}
        >
          Orbit Conference by Eburon AI
        </p>
      </div>
    </div>
  );
}
