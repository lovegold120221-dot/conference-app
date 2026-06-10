"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function createSession() {
    setLoading(true);
    // Mark this user as the host
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("lt.isHost", "true");
    }
    const sessionId = crypto.randomUUID();
    router.push(`/session/${sessionId}`);
  }

  return (
    <div className="page">
      <div className="container" style={{ textAlign: "center" }}>
        {/* Eyebrow */}
        <p className="mono enter" style={{ marginBottom: 20, color: "var(--fg-tertiary)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Powered by Eburon AI
        </p>

        {/* Title */}
        <h1 className="display display-xl enter-d1" style={{ marginBottom: 20 }}>
          Orbit Conference
        </h1>

        {/* Subtitle */}
        <p
          className="body enter-d2"
          style={{ maxWidth: 360, margin: "0 auto 40px" }}
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
            style={{ padding: "16px 40px", fontSize: 15, borderRadius: 14 }}
          >
            {loading ? (
              <>
                <span className="spinner" /> Creating…
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
            marginTop: 80,
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
            { step: "03", text: "Each language pair spins up one AI translation session on demand" },
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
        <p className="mono enter-d4" style={{ marginTop: 48, fontSize: 11, letterSpacing: "0.06em" }}>
          Orbit Conference by Eburon AI
        </p>
      </div>
    </div>
  );
}
