"use client";

import { useEffect, useState } from "react";

interface MediaDeviceInfo {
  deviceId: string;
  label: string;
}

interface DeviceSelectorProps {
  /** Currently selected audio input (mic) device ID */
  audioInputId?: string;
  /** Currently selected audio output (speaker) device ID */
  audioOutputId?: string;
  /** Currently selected video input (camera) device ID */
  videoInputId?: string;
  /** Called when user picks a new audio input */
  onAudioInputChange: (deviceId: string) => void;
  /** Called when user picks a new audio output */
  onAudioOutputChange: (deviceId: string) => void;
  /** Called when user picks a new video input */
  onVideoInputChange: (deviceId: string) => void;
  /** Close the selector */
  onClose: () => void;
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function MicGroupIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function SpeakerGroupIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

function CameraGroupIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

export default function DeviceSelector({
  audioInputId,
  audioOutputId,
  videoInputId,
  onAudioInputChange,
  onAudioOutputChange,
  onVideoInputChange,
  onClose,
}: DeviceSelectorProps) {
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([]);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function enumerate() {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
          .then((stream) => stream.getTracks().forEach((t) => t.stop()))
          .catch(() => {});

        const devices = await navigator.mediaDevices.enumerateDevices();
        setMics(
          devices
            .filter((d) => d.kind === "audioinput")
            .map((d) => ({ deviceId: d.deviceId, label: d.label || `Mic ${d.deviceId.slice(0, 6)}` })),
        );
        setSpeakers(
          devices
            .filter((d) => d.kind === "audiooutput")
            .map((d) => ({ deviceId: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 6)}` })),
        );
        setCameras(
          devices
            .filter((d) => d.kind === "videoinput")
            .map((d) => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 6)}` })),
        );
      } catch (err) {
        console.warn("Device enumeration failed:", err);
      } finally {
        setLoading(false);
      }
    }
    enumerate();
  }, []);

  useEffect(() => {
    const handler = () => {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          setMics(
            devices
              .filter((d) => d.kind === "audioinput")
              .map((d) => ({ deviceId: d.deviceId, label: d.label || `Mic ${d.deviceId.slice(0, 6)}` })),
          );
          setSpeakers(
            devices
              .filter((d) => d.kind === "audiooutput")
              .map((d) => ({ deviceId: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 6)}` })),
          );
          setCameras(
            devices
              .filter((d) => d.kind === "videoinput")
              .map((d) => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 6)}` })),
          );
        })
        .catch(() => {});
    };
    navigator.mediaDevices.addEventListener("devicechange", handler);
    return () => navigator.mediaDevices.removeEventListener("devicechange", handler);
  }, []);

  if (loading) {
    return (
      <div className="device-selector">
        <div className="device-selector-header">
          <span className="device-selector-title">Audio &amp; Video</span>
          <button className="device-selector-close" onClick={onClose}><XIcon /></button>
        </div>
        <div className="device-selector-loading">Scanning devices&hellip;</div>
      </div>
    );
  }

  return (
    <div className="device-selector">
      <div className="device-selector-header">
        <span className="device-selector-title">Audio &amp; Video</span>
        <button className="device-selector-close" onClick={onClose}><XIcon /></button>
      </div>

      <DeviceGroup
        label="Microphone"
        icon={<MicGroupIcon />}
        devices={mics}
        selectedId={audioInputId}
        onChange={onAudioInputChange}
      />

      <DeviceGroup
        label="Speaker"
        icon={<SpeakerGroupIcon />}
        devices={speakers}
        selectedId={audioOutputId}
        onChange={onAudioOutputChange}
      />

      <DeviceGroup
        label="Camera"
        icon={<CameraGroupIcon />}
        devices={cameras}
        selectedId={videoInputId}
        onChange={onVideoInputChange}
      />
    </div>
  );
}

function DeviceGroup({
  label,
  icon,
  devices,
  selectedId,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  devices: MediaDeviceInfo[];
  selectedId?: string;
  onChange: (deviceId: string) => void;
}) {
  return (
    <div className="device-group">
      <span className="device-group-label">{icon} {label}</span>
      {devices.length === 0 ? (
        <span className="device-group-empty">No devices found</span>
      ) : (
        <select
          className="device-select"
          value={selectedId ?? devices[0]?.deviceId ?? ""}
          onChange={(e) => onChange(e.target.value)}
        >
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}


