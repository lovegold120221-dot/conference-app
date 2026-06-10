"use client";

import { useEffect, useRef, useState } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { Track } from "livekit-client";
import AudioVisualizer from "./AudioVisualizer";

/**
 * Self-view PIP shown in the stage header.
 *
 * @param micStream  The local microphone MediaStream (for the audio visualizer).
 *                   Pass null/undefined when the mic is off.
 */
export default function SelfView({
  micStream,
}: {
  micStream?: MediaStream | null;
}) {
  const { localParticipant, cameraTrack } = useLocalParticipant();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraOn, setCameraOn] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const track = cameraTrack?.track;
    const on =
      !!track &&
      cameraTrack?.source === Track.Source.Camera &&
      !cameraTrack.isMuted;
    if (on && track) {
      track.attach(video);
      setCameraOn(true);
      return () => {
        track.detach(video);
      };
    }
    video.srcObject = null;
    setCameraOn(false);
  }, [cameraTrack, localParticipant]);

  const displayName = localParticipant?.name || "you";

  return (
    <div className="self-view">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="self-view-video"
        style={{ display: cameraOn ? "block" : "none" }}
      />
      {!cameraOn && (
        <div className="self-view-empty">
          <span>{displayName}</span>
        </div>
      )}
      {/* Mic audio visualizer overlay */}
      <div className="self-view-visualizer">
        <AudioVisualizer
          stream={micStream ?? undefined}
          barCount={4}
          height={16}
          width={24}
        />
      </div>
    </div>
  );
}
