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
        // Request permission to access devices so labels are available
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
          .then((stream) => stream.getTracks().forEach((t) => t.stop()))
          .catch(() => {
            /* permission may be denied — show devices without labels */
          });

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

  // Listen for device changes (e.g., plugging in a new mic)
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
          <span className="device-selector-title">Audio & Video</span>
          <button className="device-selector-close" onClick={onClose}>Done</button>
        </div>
        <div className="device-selector-loading">Scanning devices…</div>
      </div>
    );
  }

  return (
    <div className="device-selector">
      <div className="device-selector-header">
        <span className="device-selector-title">Audio & Video</span>
        <button className="device-selector-close" onClick={onClose}>Done</button>
      </div>

      <DeviceGroup
        label="Microphone"
        devices={mics}
        selectedId={audioInputId}
        onChange={onAudioInputChange}
      />

      <DeviceGroup
        label="Speaker"
        devices={speakers}
        selectedId={audioOutputId}
        onChange={onAudioOutputChange}
      />

      <DeviceGroup
        label="Camera"
        devices={cameras}
        selectedId={videoInputId}
        onChange={onVideoInputChange}
      />
    </div>
  );
}

function DeviceGroup({
  label,
  devices,
  selectedId,
  onChange,
}: {
  label: string;
  devices: MediaDeviceInfo[];
  selectedId?: string;
  onChange: (deviceId: string) => void;
}) {
  return (
    <div className="device-group">
      <span className="device-group-label">{label}</span>
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
