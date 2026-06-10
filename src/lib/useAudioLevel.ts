"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tracks the RMS audio level (0–1) from a local microphone MediaStream.
 * Used to drive the mic input visualizer.
 *
 * @param stream  The local mic MediaStream (or null/undefined if mic is off).
 * @returns       A normalised 0‑1 level value updated ~20×/second.
 */
export function useAudioLevel(
  stream: MediaStream | null | undefined,
): number {
  const [level, setLevel] = useState(0);
  const rafRef = useRef<number>(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!stream) {
      cancelAnimationFrame(rafRef.current);
      setLevel(0);
      return;
    }

    // Create a minimal AudioContext just for analysis.
    // We reuse it across stream changes to avoid GC pressure.
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    const ctx = ctxRef.current;

    // Disconnect previous source.
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }
    sourceRef.current = ctx.createMediaStreamSource(stream);

    if (!analyserRef.current) {
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = 256;
    }
    const analyser = analyserRef.current;

    sourceRef.current.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    function tick() {
      analyser.getByteTimeDomainData(data);
      // Compute RMS from the waveform
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const normalized = (data[i] - 128) / 128; // 0…255 → -1…1
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / data.length);
      // Clamp & smooth a bit
      const clamped = Math.min(1, rms * 2.5);
      setLevel(clamped);
      rafRef.current = requestAnimationFrame(tick);
    }

    tick();

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [stream]);

  return level;
}
