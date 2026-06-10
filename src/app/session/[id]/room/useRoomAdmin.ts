"use client";

import { useCallback } from "react";

/**
 * Hook that returns admin actions for the room management API.
 * All calls are fire-and-forget POSTs to /api/room/manage.
 */
export function useRoomAdmin(roomName: string, identity: string) {
  const call = useCallback(
    async (body: Record<string, unknown>) => {
      try {
        const res = await fetch("/api/room/manage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room: roomName, identity, ...body }),
        });
        const data = await res.json();
        if (!res.ok) {
          console.warn("Room admin API error:", data.error);
          return { ok: false, error: data.error };
        }
        return { ok: true, ...data };
      } catch (err: any) {
        console.warn("Room admin fetch error:", err);
        return { ok: false, error: err.message };
      }
    },
    [roomName, identity],
  );

  const lock = useCallback(() => call({ action: "lock" }), [call]);
  const unlock = useCallback(() => call({ action: "unlock" }), [call]);
  const removeParticipant = useCallback(
    (targetIdentity: string) =>
      call({ action: "remove-participant", targetIdentity }),
    [call],
  );
  const muteAll = useCallback(
    () => call({ action: "mute-all" }),
    [call],
  );
  const muteParticipant = useCallback(
    (targetIdentity: string) =>
      call({ action: "mute-participant", targetIdentity }),
    [call],
  );
  const admit = useCallback(
    (targetIdentity: string) =>
      call({ action: "admit", targetIdentity }),
    [call],
  );
  const deny = useCallback(
    (targetIdentity: string) =>
      call({ action: "deny", targetIdentity }),
    [call],
  );
  const promote = useCallback(
    (targetIdentity: string) =>
      call({ action: "promote", targetIdentity }),
    [call],
  );
  const demote = useCallback(
    (targetIdentity: string) =>
      call({ action: "demote", targetIdentity }),
    [call],
  );
  const setScreenShare = useCallback(
    (targetIdentity: string, allowed: boolean) =>
      call({ action: "set-screen-share", targetIdentity, allowed }),
    [call],
  );

  return {
    lock,
    unlock,
    removeParticipant,
    muteAll,
    muteParticipant,
    admit,
    deny,
    promote,
    demote,
    setScreenShare,
  };
}
