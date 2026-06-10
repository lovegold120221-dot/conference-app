"use client";

import { useEffect, useRef, useState } from "react";
import { Track, type Participant } from "livekit-client";
import { useRemoteParticipants, useTracks } from "@livekit/components-react";

export default function ScreenShareTile() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [screenTrack, setScreenTrack] = useState<{ participant: Participant; track: MediaStreamTrack } | null>(null);

  // Watch for screen share tracks among remote participants
  const screenTracks = useTracks([Track.Source.ScreenShare, Track.Source.ScreenShareAudio]);

  useEffect(() => {
    // Find the first active screen share track
    for (const t of screenTracks) {
      if (t.publication.track && !t.publication.isMuted && t.source === Track.Source.ScreenShare) {
        const participant = t.participant;
        const track = t.publication.track;
        setScreenTrack({ participant, track: track.mediaStreamTrack });
        return;
      }
    }
    // No active screen share
    setScreenTrack(null);
  }, [screenTracks]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !screenTrack) return;
    video.srcObject = new MediaStream([screenTrack.track]);
    return () => {
      video.srcObject = null;
    };
  }, [screenTrack]);

  if (!screenTrack) return null;

  const name = screenTrack.participant.name || screenTrack.participant.identity;

  return (
    <div className="screen-share-tile">
      <div className="screen-share-header">
        <span className="screen-share-label">Screen Share</span>
        <span className="screen-share-name">{name}</span>
      </div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="screen-share-video"
      />
    </div>
  );
}
