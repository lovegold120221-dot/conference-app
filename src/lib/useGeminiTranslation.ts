"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useRemoteParticipants,
  useRoomContext,
} from "@livekit/components-react";
import { RoomEvent, Track } from "livekit-client";
import { GeminiLiveClient, type GeminiStatus } from "./geminiLiveClient";
import { AudioPipeline } from "./audioPipeline";
import { DICTIONARY_LANGS, NATIVE_LANG } from "./config";

// ── Types ────────────────────────────────────────────────────────────

export interface CaptionEntry {
  id: string;
  text: string;
  final: boolean;
  timestamp: number;
}

export interface UseGeminiTranslationResult {
  /** Current Gemini Live session status. */
  status: GeminiStatus | "idle" | "dictionary";
  /** Accumulated caption entries from the translation session. */
  captions: CaptionEntry[];
  /** Persist a caption from external sources (e.g. data channel). */
  addExternalCaption: (entry: CaptionEntry) => void;
}

// ── Hook ─────────────────────────────────────────────────────────────

/**
 * Manages a per-client Gemini Live translation session.
 *
 * Replaces the old `useTranslationRouting` hook — instead of subscribing
 * to server‑published translation tracks, each client connects its own
 * Gemini session and routes remote audio → Gemini → translated audio out.
 *
 * @param targetLang  The user's "I listen in" language code.
 * @returns           Status, captions, and helpers.
 */
export function useGeminiTranslation(
  targetLang: string,
  options?: { playbackMuted?: boolean },
): UseGeminiTranslationResult {
  const playbackMuted = options?.playbackMuted ?? false;
  const room = useRoomContext();
  const remoteParticipants = useRemoteParticipants();

  const [status, setStatus] = useState<GeminiStatus | "idle" | "dictionary">(
    "idle",
  );
  const [captions, setCaptions] = useState<CaptionEntry[]>([]);
  const captionsRef = useRef(captions);
  captionsRef.current = captions;

  const clientRef = useRef<GeminiLiveClient | null>(null);
  const pipelineRef = useRef<AudioPipeline | null>(null);
  const langRef = useRef(targetLang);
  langRef.current = targetLang;
  const mutedRef = useRef(playbackMuted);
  mutedRef.current = playbackMuted;

  // ── Connect / reconnect when targetLang changes ──
  useEffect(() => {
    // No language selected or native → no translation needed.
    if (!targetLang || targetLang === NATIVE_LANG) {
      setStatus("idle");
      return;
    }

    // Dictionary languages are handled by a separate path.
    if (DICTIONARY_LANGS.has(targetLang)) {
      setStatus("dictionary");
      return;
    }

    let cancelled = false;

    async function init() {
      try {
        // 1. Fetch the API key from the server (never in client bundle).
        const res = await fetch("/api/gemini-key");
        if (!res.ok) {
          throw new Error(`Gemini key fetch failed: ${res.status}`);
        }
        const { apiKey } = await res.json();
        if (!apiKey || cancelled) return;

        // 2. Start the browser audio pipeline.
        const pipeline = new AudioPipeline();
        pipelineRef.current = pipeline;

        // 3. Create the Gemini client.
        const client = new GeminiLiveClient({
          onAudio: (pcm, sampleRate) => {
            if (!mutedRef.current) {
              pipeline.playTranslatedAudio(pcm, sampleRate);
            }
          },
          onTranscript: (text, final) => {
            const entry: CaptionEntry = {
              id: crypto.randomUUID(),
              text,
              final,
              timestamp: Date.now(),
            };
            setCaptions((prev) => [...prev, entry]);
          },
          onStatusChange: (s) => {
            if (!cancelled) setStatus(s);
          },
          onError: (err) => {
            console.error("[gemini-translation]", err.message);
          },
        });
        clientRef.current = client;

        // 4. Connect to Gemini Live API.
        await client.connect(apiKey, targetLang);

        // 5. Start the pipeline (this begins PCM capture).
        await pipeline.start((pcm) => {
          client.sendAudio(pcm);
        });

        // 6. Wire up already-connected remote participants.
        for (const p of remoteParticipants) {
          const pub = p.getTrackPublication(Track.Source.Microphone);
          if (!pub?.track) continue;
          if (pub.track.mediaStream) {
            pipeline.addRemoteTrack(
              p.identity,
              pub.track.mediaStream,
            );
          }
        }
      } catch (err) {
        console.error("[gemini-translation] init failed:", err);
        if (!cancelled) setStatus("error");
      }
    }

    init();

    return () => {
      cancelled = true;
      clientRef.current?.disconnect();
      pipelineRef.current?.close();
      clientRef.current = null;
      pipelineRef.current = null;
    };
    // Intentionally only react to targetLang changes — remoteParticipants
    // will be handled by the TrackSubscribed listener below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetLang]);

  // ── Track newly-published / unpublished remote audio tracks ──
  useEffect(() => {
    if (!room) return;

    const handleSub = (track: any) => {
      const pipeline = pipelineRef.current;
      if (!pipeline) return;
      if (track.kind !== "audio") return;
      // Find the participant who owns this track
      for (const p of room.remoteParticipants.values()) {
        for (const pub of p.audioTrackPublications.values()) {
          if (
            pub.track === track &&
            track.mediaStream &&
            pub.source === Track.Source.Microphone
          ) {
            pipeline.addRemoteTrack(p.identity, track.mediaStream);
            return;
          }
        }
      }
    };

    const handleUnsub = (track: any) => {
      const pipeline = pipelineRef.current;
      if (!pipeline) return;
      // Find the participant who owned this track
      for (const p of room.remoteParticipants.values()) {
        for (const pub of p.audioTrackPublications.values()) {
          if (pub.track === track && pub.source === Track.Source.Microphone) {
            pipeline.removeRemoteTrack(p.identity);
            return;
          }
        }
      }
    };

    room.on(RoomEvent.TrackSubscribed, handleSub);
    room.on(RoomEvent.TrackUnsubscribed, handleUnsub);

    return () => {
      room.off(RoomEvent.TrackSubscribed, handleSub);
      room.off(RoomEvent.TrackUnsubscribed, handleUnsub);
    };
  }, [room]);

  // ── Allow external sources to push captions (e.g. data channel for byv) ──
  const addExternalCaption = useCallback((entry: CaptionEntry) => {
    setCaptions((prev) => [...prev, entry]);
  }, []);

  return { status, captions, addExternalCaption };
}
