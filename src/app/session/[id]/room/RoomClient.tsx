"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
} from "@livekit/components-react";
import "@livekit/components-styles";
import InCall from "./InCall";

const STORAGE_KEY_NAME = "lt.displayName";
const STORAGE_KEY_LANG = "lt.lang";
const STORAGE_KEY_HOST = "lt.isHost";

interface TokenResponse {
  token: string;
  serverUrl: string;
  role?: string;
}

export default function RoomClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [identity] = useState(() =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? `peer-${crypto.randomUUID().slice(0, 8)}`
      : `peer-${Math.random().toString(36).slice(2, 10)}`,
  );
  const [displayName, setDisplayName] = useState<string>("");
  const [initialLang, setInitialLang] = useState<string>("en");

  // Pull name + lang + host status from sessionStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const name = window.sessionStorage.getItem(STORAGE_KEY_NAME);
    const lang = window.sessionStorage.getItem(STORAGE_KEY_LANG);
    const storedHost = window.sessionStorage.getItem(STORAGE_KEY_HOST);
    if (!name || !lang) {
      router.replace(`/session/${sessionId}`);
      return;
    }
    setDisplayName(name);
    setInitialLang(lang);
    setIsHost(storedHost === "true");
  }, [router, sessionId]);

  // Mint a LiveKit token, passing host flag if applicable
  useEffect(() => {
    if (!displayName) return;
    const hostParam = isHost ? "&host=true" : "";
    const url = `/api/token?room=${encodeURIComponent(
      sessionId,
    )}&identity=${encodeURIComponent(identity)}&name=${encodeURIComponent(displayName)}${hostParam}`;
    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Token request failed (${res.status})`);
        }
        return res.json() as Promise<TokenResponse>;
      })
      .then((data) => {
        setToken(data.token);
        setServerUrl(data.serverUrl);
        // Server confirms role — if host, keep it
        if (data.role === "host") {
          setIsHost(true);
        }
      })
      .catch((err) => setError(err.message));
  }, [sessionId, identity, displayName, isHost]);

  function handleLeave() {
    router.push("/");
  }

  if (error) {
    return (
      <div className="page">
        <div className="container" style={{ textAlign: "center" }}>
          <h1 className="display display-md" style={{ marginBottom: 16 }}>
            Couldn&apos;t join the call
          </h1>
          <p className="body" style={{ marginBottom: 24 }}>
            {error}
          </p>
          <button className="btn btn-outline" onClick={() => router.push("/")}>
            Back to home
          </button>
        </div>
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className="page">
        <div className="container" style={{ textAlign: "center" }}>
          <div className="spinner" style={{ margin: "0 auto 16px" }} />
          <p className="mono">Connecting…</p>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      video={false}
      audio={false}
      connect={true}
      onDisconnected={handleLeave}
      data-lk-theme="default"
      style={{ height: "100vh", background: "var(--bg)", position: "relative", zIndex: 1 }}
    >
      <InCall initialLang={initialLang} onLeave={handleLeave} isHost={isHost} />
      <RoomAudioRenderer />
      <StartAudio
        label="🔊 Tap to enable translated audio"
        className="start-audio-overlay"
      />
    </LiveKitRoom>
  );
}
