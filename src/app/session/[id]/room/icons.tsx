/**
 * Jitsi Meet‑style icons — clean, thin, consistent line work with
 * 2px stroke, round caps/joins, minimal decoration.
 */

const baseProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function MicOnIcon() {
  return (
    <svg {...baseProps}>
      <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 11v1a7 7 0 0 1-14 0v-1" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

export function MicOffIcon() {
  return (
    <svg {...baseProps}>
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M16 11.4V5a4 4 0 0 0-7.3-2.3" />
      <path d="M9 9v1a3 3 0 0 0 5.1 2.1" />
      <path d="M5 12v1a7 7 0 0 0 10.6 5.9" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

export function CamOnIcon() {
  return (
    <svg {...baseProps}>
      <rect x="2" y="5" width="15" height="14" rx="2.5" />
      <polygon points="17 9.5 22 7 22 17 17 14.5" />
    </svg>
  );
}

export function CamOffIcon() {
  return (
    <svg {...baseProps}>
      <line x1="2" y1="2" x2="22" y2="22" />
      <rect x="2" y="5" width="15" height="14" rx="2.5" />
      <polygon points="17 9.5 22 7 22 17 17 14.5" />
    </svg>
  );
}

export function LinkIcon() {
  return (
    <svg {...baseProps}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export function LeaveIcon() {
  return (
    <svg {...baseProps}>
      <path d="M22 12h-9" />
      <path d="M15 8l4 4-4 4" />
      <path d="M5 3h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    </svg>
  );
}

export function CaptionsIcon() {
  return (
    <svg {...baseProps}>
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <path d="M7 10.5a1.5 1.5 0 0 1 3 0" />
      <path d="M7 13.5a1.5 1.5 0 0 1 3 0" />
      <path d="M14 10.5a1.5 1.5 0 0 1 3 0" />
      <path d="M14 13.5a1.5 1.5 0 0 1 3 0" />
    </svg>
  );
}

export function ChevronDownIcon({ size = 12 }: { size?: number }) {
  return (
    <svg {...baseProps} width={size} height={size} viewBox="0 0 24 24">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function ScreenShareIcon() {
  return (
    <svg {...baseProps}>
      <rect x="2" y="5" width="20" height="13" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="18" x2="12" y2="21" />
      <polyline points="8 11 12 15 16 11" />
    </svg>
  );
}

export function ScreenShareOffIcon() {
  return (
    <svg {...baseProps}>
      <rect x="2" y="5" width="20" height="13" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="18" x2="12" y2="21" />
      <line x1="9" y1="10" x2="11" y2="12" />
      <line x1="11" y1="12" x2="9" y2="14" />
      <line x1="15" y1="10" x2="13" y2="12" />
      <line x1="13" y1="12" x2="15" y2="14" />
    </svg>
  );
}

export function PeopleIcon() {
  return (
    <svg {...baseProps}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function GridViewIcon() {
  return (
    <svg {...baseProps}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

export function SpeakerViewIcon() {
  return (
    <svg {...baseProps}>
      <rect x="2" y="3" width="20" height="13" rx="2" />
      <rect x="4" y="18" width="7" height="4" rx="1" />
      <rect x="13" y="18" width="7" height="4" rx="1" />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg {...baseProps}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function LockOpenIcon() {
  return (
    <svg {...baseProps}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 7.8-1.5" />
    </svg>
  );
}

export function MuteAllIcon() {
  return (
    <svg {...baseProps}>
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M9 5v1a4 4 0 0 0 4.5 3.9" />
      <path d="M14 4.5V5a4 4 0 0 1 2 3.4" />
      <path d="M5 11a7 7 0 0 0 11.3 5.3" />
      <path d="M19 11a7 7 0 0 1-1.5 4.2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

export function KickIcon() {
  return (
    <svg {...baseProps}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="20" y1="16" x2="26" y2="10" />
      <line x1="20" y1="10" x2="26" y2="16" />
    </svg>
  );
}

export function CrownIcon() {
  return (
    <svg {...baseProps}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export function SettingsIcon() {
  return (
    <svg {...baseProps}>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 1.5v2" />
      <path d="M12 20.5v2" />
      <path d="M4.93 4.93l1.41 1.41" />
      <path d="M17.66 17.66l1.41 1.41" />
      <path d="M1.5 12h2" />
      <path d="M20.5 12h2" />
      <path d="M4.93 19.07l1.41-1.41" />
      <path d="M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

export function SpeakerIcon() {
  return (
    <svg {...baseProps}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

export function SpeakerOffIcon() {
  return (
    <svg {...baseProps}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg {...baseProps}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg {...baseProps}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function ShieldIcon() {
  return (
    <svg {...baseProps}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
