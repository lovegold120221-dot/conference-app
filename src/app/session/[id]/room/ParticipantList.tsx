"use client";

import { useMemo, useState } from "react";
import type { RemoteParticipant } from "livekit-client";
import { useRemoteParticipants, useLocalParticipant } from "@livekit/components-react";
import { useRoomAdmin } from "./useRoomAdmin";
import { useRoomContext } from "@livekit/components-react";
import {
  MicOffIcon,
  KickIcon,
  CrownIcon,
  ShieldIcon,
  MuteAllIcon,
} from "./icons";

interface ParticipantListProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Parse the role from participant metadata.
 */
function getRole(p: RemoteParticipant | { metadata?: string }): string {
  try {
    if (p.metadata) {
      const meta = JSON.parse(p.metadata);
      return meta.role || "participant";
    }
  } catch {}
  return "participant";
}

export default function ParticipantList({ open, onClose }: ParticipantListProps) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const remotes = useRemoteParticipants();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const myIdentity = localParticipant?.identity || "";
  const myRole = getRole(localParticipant ?? {});
  const isHostOrCoHost = myRole === "host" || myRole === "co-host";

  const admin = useRoomAdmin(room.name, myIdentity);

  // Combine local + remote, sorted: host first, then co-hosts, then participants
  const allParticipants = useMemo(() => {
    const list: Array<{
      identity: string;
      name: string;
      role: string;
      isLocal: boolean;
      isSpeaking: boolean;
      micOn: boolean;
    }> = [];

    if (localParticipant) {
      list.push({
        identity: localParticipant.identity,
        name: localParticipant.name || "You",
        role: myRole,
        isLocal: true,
        isSpeaking: false,
        micOn: true,
      });
    }

    for (const p of remotes) {
      if (p.identity?.startsWith("gemini-translator")) continue;
      list.push({
        identity: p.identity,
        name: p.name || p.identity,
        role: getRole(p),
        isLocal: false,
        isSpeaking: p.isSpeaking,
        micOn: true,
      });
    }

    const rank = (role: string) =>
      role === "host" ? 0 : role === "co-host" ? 1 : 2;
    list.sort((a, b) => rank(a.role) - rank(b.role) || a.name.localeCompare(b.name));
    return list;
  }, [localParticipant, remotes, myRole]);

  const handleAction = async (action: string, targetIdentity: string) => {
    setActionLoading(targetIdentity);
    try {
      switch (action) {
        case "remove":
          await admin.removeParticipant(targetIdentity);
          break;
        case "mute":
          await admin.muteParticipant(targetIdentity);
          break;
        case "promote":
          await admin.promote(targetIdentity);
          break;
        case "demote":
          await admin.demote(targetIdentity);
          break;
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleMuteAll = async () => {
    setActionLoading("__muteAll__");
    try {
      await admin.muteAll();
    } finally {
      setActionLoading(null);
    }
  };

  if (!open) return null;

  const userCount = allParticipants.length;

  return (
    <div className="participant-list">
      <div className="participant-list-header">
        <span className="participant-list-title">
          Participants {userCount > 0 && `(${userCount})`}
        </span>
        <button className="participant-list-close" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="participant-list-body">
        {allParticipants.map((p) => (
          <div key={p.identity} className="participant-row">
            <div className="participant-row-left">
              <div className="participant-avatar">
                {p.role === "host" ? (
                  <CrownIcon />
                ) : p.role === "co-host" ? (
                  <ShieldIcon />
                ) : (
                  <span className="participant-avatar-letter">
                    {p.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="participant-info">
                <span className="participant-name">
                  {p.name}
                  {p.isLocal && (
                    <span className="participant-you-badge">You</span>
                  )}
                </span>
                <span className="participant-role-tag">
                  {p.role === "host"
                    ? "Host"
                    : p.role === "co-host"
                      ? "Co-host"
                      : "Participant"}
                </span>
              </div>
            </div>

            {/* Admin controls (only for hosts/co-hosts on other participants) */}
            {isHostOrCoHost && !p.isLocal && (
              <div className="participant-actions">
                <button
                  className="participant-action-btn"
                  onClick={() => handleAction("mute", p.identity)}
                  disabled={actionLoading === p.identity}
                  title="Mute"
                  aria-label={`Mute ${p.name}`}
                >
                  <MicOffIcon />
                </button>
                {(myRole === "host" || (myRole === "co-host" && p.role !== "host")) && (
                  <>
                    {p.role === "co-host" || p.role === "participant" ? (
                      <button
                        className="participant-action-btn"
                        onClick={() =>
                          handleAction(
                            p.role === "co-host" ? "demote" : "promote",
                            p.identity,
                          )
                        }
                        disabled={actionLoading === p.identity}
                        title={p.role === "co-host" ? "Demote" : "Promote to co-host"}
                        aria-label={`${p.role === "co-host" ? "Demote" : "Promote"} ${p.name}`}
                      >
                        {p.role === "co-host" ? <ShieldIcon /> : <CrownIcon />}
                      </button>
                    ) : null}
                    <button
                      className="participant-action-btn participant-action-btn--danger"
                      onClick={() => handleAction("remove", p.identity)}
                      disabled={actionLoading === p.identity}
                      title="Remove"
                      aria-label={`Remove ${p.name}`}
                    >
                      <KickIcon />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mute All button for host */}
      {isHostOrCoHost && allParticipants.length > 1 && (
        <div className="participant-list-footer">
          <button
            className="participant-mute-all-btn"
            onClick={handleMuteAll}
            disabled={actionLoading === "__muteAll__"}
          >
            <MuteAllIcon /> Mute all
          </button>
        </div>
      )}
    </div>
  );
}
