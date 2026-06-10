"use client";

import { useMemo, useState } from "react";
import { useRemoteParticipants, useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { useRoomAdmin } from "./useRoomAdmin";

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function VideoOffSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="2" x2="22" y2="22" />
      <rect x="2" y="5" width="15" height="14" rx="2.5" />
      <polygon points="17 9.5 22 7 22 17 17 14.5" />
    </svg>
  );
}

function MicOffSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M16 11.4V5a4 4 0 00-7.3-2.3" />
      <path d="M9 9v1a3 3 0 005.1 2.1" />
      <path d="M5 12v1a7 7 0 0010.6 5.9" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function getRole(p: { metadata?: string }): string {
  try {
    if (p.metadata) {
      const meta = JSON.parse(p.metadata);
      return meta.role || "participant";
    }
  } catch {}
  return "participant";
}

export default function ParticipantsSidebar({
  open,
  onClose,
  inviteUrl,
}: {
  open: boolean;
  onClose: () => void;
  inviteUrl: string;
}) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const remotes = useRemoteParticipants();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const myIdentity = localParticipant?.identity || "";
  const myRole = getRole(localParticipant ?? {});
  const isHostOrCoHost = myRole === "host" || myRole === "co-host";
  const admin = useRoomAdmin(room.name, myIdentity);

  const allParticipants = useMemo(() => {
    const list: Array<{ identity: string; name: string; isLocal: boolean }> = [];
    if (localParticipant) {
      list.push({
        identity: localParticipant.identity,
        name: localParticipant.name || "You",
        isLocal: true,
      });
    }
    for (const p of remotes) {
      if (p.identity?.startsWith("gemini-translator")) continue;
      list.push({
        identity: p.identity,
        name: p.name || p.identity,
        isLocal: false,
      });
    }
    return list;
  }, [localParticipant, remotes]);

  async function handleCopyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function handleMuteAll() {
    setActionLoading("__muteAll__");
    try { await admin.muteAll(); } finally { setActionLoading(null); }
  }

  return (
    <aside className={`sidebar-right${open ? "" : " hidden"}`}>
      <div className="sidebar-right-header">
        <span className="sidebar-right-title">Participants ({allParticipants.length})</span>
        <button className="sidebar-close" onClick={onClose} aria-label="Close participants">
          <XIcon />
        </button>
      </div>

      <div className="sidebar-right-body">
        {/* Invite */}
        <button className="invite-btn" onClick={handleCopyInvite}>
          <UserPlusIcon />
          {copied ? "Copied!" : "Invite Someone"}
        </button>

        {/* Search */}
        <div className="participant-search">
          <span className="participant-search-icon"><SearchIcon /></span>
          <input type="text" placeholder="Search participants" className="participant-search-input" />
        </div>

        {/* Participant list */}
        <div style={{ marginBottom: 24 }}>
          {allParticipants.map((p) => (
            <div className="participant-row" key={p.identity}>
              <div className="participant-row-left">
                <div className="participant-avatar">
                  {p.name.slice(0, 1).toUpperCase()}
                </div>
                <span className="participant-name">
                  {p.name}{p.isLocal ? " (you)" : ""}
                </span>
              </div>
              {!p.isLocal && (
                <div className="participant-status-icons">
                  <VideoOffSmall />
                  <MicOffSmall />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Breakout Rooms */}
        <div className="breakout-section">
          <div className="breakout-header">
            <span className="breakout-title">Breakout Rooms</span>
            <button className="breakout-add-btn" title="Add Breakout Room">
              <PlusIcon />
            </button>
          </div>
          <div className="breakout-empty">
            <p className="breakout-empty-text">No breakout rooms created.</p>
            <button className="breakout-auto-btn">Auto-Assign Rooms</button>
          </div>
        </div>
      </div>

      {/* Mute all footer */}
      <div className="sidebar-right-footer">
        <button
          className="mute-all-btn"
          onClick={handleMuteAll}
          disabled={actionLoading === "__muteAll__"}
        >
          Mute Everyone Else
        </button>
      </div>
    </aside>
  );
}
