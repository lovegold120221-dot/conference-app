"use client";

import { useAudioLevel } from "@/lib/useAudioLevel";

/**
 * Animated VU-meter audio visualizer.
 *
 * Renders a set of animated bars that pulse with the microphone input level.
 * Looks great in both light and dark UIs.
 *
 * @param stream   Local mic MediaStream (or null/undefined if mic is off).
 * @param barCount Number of bars in the visualizer (default 6).
 * @param height   Total visualizer height in px (default 32).
 * @param width    Total visualizer width in px (default 48).
 */
export default function AudioVisualizer({
  stream,
  barCount = 6,
  height = 32,
  width = 48,
}: {
  stream: MediaStream | null | undefined;
  barCount?: number;
  height?: number;
  width?: number;
}) {
  const level = useAudioLevel(stream);
  const barW = Math.max(3, (width - (barCount - 1) * 2) / barCount);

  return (
    <div
      className="audio-visualizer"
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 2,
        height,
        width,
        flexShrink: 0,
      }}
    >
      {Array.from({ length: barCount }).map((_, i) => {
        // Each bar gets a fraction of the total level based on position
        const fraction = (i + 1) / barCount;
        // Bar peaks slightly earlier for lower bars → nice "wave" effect
        const barLevel = Math.max(
          0.08,
          Math.min(1, level * 1.8 * (1 - fraction * 0.3)),
        );
        const barH = Math.max(2, height * barLevel);

        return (
          <div
            key={i}
            className={`audio-visualizer-bar ${level > 0 ? "active" : ""}`}
            style={{
              width: barW,
              height: barH,
              borderRadius: "2px 2px 0 0",
              background:
                barLevel > 0.7
                  ? "var(--accent)"
                  : barLevel > 0.4
                    ? "color-mix(in srgb, var(--accent) 70%, #fff 30%)"
                    : "color-mix(in srgb, var(--accent) 40%, #fff 60%)",
              opacity: level > 0 ? 1 : 0.3,
              transition: "height 80ms ease, opacity 200ms ease",
              transformOrigin: "bottom",
            }}
          />
        );
      })}
    </div>
  );
}
