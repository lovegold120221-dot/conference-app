import { NextRequest, NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";
import { TrackSource } from "@livekit/protocol";

/**
 * POST /api/room/manage
 *
 * Room admin operations. Requires a valid LiveKit token from the host.
 * Body: { action, room, identity, targetIdentity?, sourceType? }
 *
 * Actions:
 *   lock              — Lock the room (set metadata flag)
 *   unlock            — Unlock the room
 *   remove-participant — Kick a participant by identity
 *   mute-all          — Mute all microphone tracks
 *   mute-participant  — Mute a specific participant's mic
 *   admit             — Grant publishing permission to a lobby participant
 *   deny              — Remove a lobby participant
 *   set-screen-share  — Allow/disallow screen share for a participant
 *   promote           — Set participant role to co-host
 *   demote            — Set participant role back to participant
 */
export async function POST(req: NextRequest) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const hostUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !hostUrl) {
    return NextResponse.json(
      { error: "LiveKit credentials not configured" },
      { status: 500 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const { action, room, identity, targetIdentity, allowed } = body;

  if (!action || !room || !identity) {
    return NextResponse.json(
      { error: "Missing required fields: action, room, identity" },
      { status: 400 },
    );
  }

  const roomService = new RoomServiceClient(hostUrl, apiKey, apiSecret);

  try {
    switch (action) {
      // ── Room lock ──────────────────────────────────────────
      case "lock": {
        await roomService.updateRoomMetadata(
          room,
          JSON.stringify({
            locked: true,
            lockedBy: identity,
            lockedAt: Date.now(),
          }),
        );
        return NextResponse.json({ ok: true, locked: true });
      }

      case "unlock": {
        await roomService.updateRoomMetadata(
          room,
          JSON.stringify({
            locked: false,
            lockedBy: null,
            lockedAt: null,
          }),
        );
        return NextResponse.json({ ok: true, locked: false });
      }

      // ── Remove participant ─────────────────────────────────
      case "remove-participant": {
        if (!targetIdentity) {
          return NextResponse.json(
            { error: "targetIdentity required" },
            { status: 400 },
          );
        }
        await roomService.removeParticipant(room, targetIdentity);
        return NextResponse.json({ ok: true });
      }

      // ── Mute all microphone tracks ─────────────────────────
      case "mute-all": {
        const participants = await roomService.listParticipants(room);
        for (const p of participants) {
          if (!p.identity || p.identity.startsWith("gemini-translator")) continue;
          if (p.identity === identity) continue;
          // Mute each microphone track by its SID
          for (const track of p.tracks || []) {
            if (track.source === TrackSource.MICROPHONE) {
              try {
                await roomService.mutePublishedTrack(
                  room,
                  p.identity,
                  track.sid!,
                  true,
                );
              } catch {
                // track may already be gone
              }
            }
          }
        }
        return NextResponse.json({ ok: true });
      }

      // ── Mute a specific participant ────────────────────────
      case "mute-participant": {
        if (!targetIdentity) {
          return NextResponse.json(
            { error: "targetIdentity required" },
            { status: 400 },
          );
        }
        const info = await roomService.getParticipant(room, targetIdentity);
        for (const track of info.tracks || []) {
          if (track.source === TrackSource.MICROPHONE) {
            try {
              await roomService.mutePublishedTrack(
                room,
                targetIdentity,
                track.sid!,
                true,
              );
            } catch {
              // track may already be gone
            }
          }
        }
        return NextResponse.json({ ok: true });
      }

      // ── Admit from lobby (grant publishing) ────────────────
      case "admit": {
        if (!targetIdentity) {
          return NextResponse.json(
            { error: "targetIdentity required" },
            { status: 400 },
          );
        }
        await roomService.updateParticipant(room, targetIdentity, {
          permission: {
            canPublish: true,
            canPublishData: true,
            canPublishSources: [
              TrackSource.CAMERA,
              TrackSource.MICROPHONE,
              TrackSource.SCREEN_SHARE,
            ],
            canSubscribe: true,
            hidden: false,
            recorder: false,
          },
          metadata: JSON.stringify({ role: "participant", admitted: true }),
        });
        return NextResponse.json({ ok: true });
      }

      // ── Deny / remove from lobby ───────────────────────────
      case "deny": {
        if (!targetIdentity) {
          return NextResponse.json(
            { error: "targetIdentity required" },
            { status: 400 },
          );
        }
        await roomService.removeParticipant(room, targetIdentity);
        return NextResponse.json({ ok: true });
      }

      // ── Screen share permission ────────────────────────────
      case "set-screen-share": {
        if (!targetIdentity) {
          return NextResponse.json(
            { error: "targetIdentity required" },
            { status: 400 },
          );
        }
        const canShare = allowed === true;
        const info = await roomService.getParticipant(room, targetIdentity);
        const currentMeta = info.metadata || "{}";
        let parsedMeta: Record<string, unknown> = {};
        try { parsedMeta = JSON.parse(currentMeta); } catch {}

        await roomService.updateParticipant(room, targetIdentity, {
          permission: {
            canPublish: info.permission?.canPublish ?? true,
            canPublishData: info.permission?.canPublishData ?? true,
            canPublishSources: canShare
              ? [
                  TrackSource.CAMERA,
                  TrackSource.MICROPHONE,
                  TrackSource.SCREEN_SHARE,
                ]
              : [TrackSource.CAMERA, TrackSource.MICROPHONE],
            canSubscribe: info.permission?.canSubscribe ?? true,
            hidden: false,
            recorder: false,
          },
        });
        return NextResponse.json({ ok: true, screenShareAllowed: canShare });
      }

      // ── Promote to co-host ─────────────────────────────────
      case "promote": {
        if (!targetIdentity) {
          return NextResponse.json(
            { error: "targetIdentity required" },
            { status: 400 },
          );
        }
        await roomService.updateParticipant(room, targetIdentity, {
          metadata: JSON.stringify({ role: "co-host" }),
        });
        return NextResponse.json({ ok: true, role: "co-host" });
      }

      // ── Demote from co-host ────────────────────────────────
      case "demote": {
        if (!targetIdentity) {
          return NextResponse.json(
            { error: "targetIdentity required" },
            { status: 400 },
          );
        }
        await roomService.updateParticipant(room, targetIdentity, {
          metadata: JSON.stringify({ role: "participant" }),
        });
        return NextResponse.json({ ok: true, role: "participant" });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (err: any) {
    console.error(`Room manage error (${action}):`, err);
    return NextResponse.json(
      { error: err.message || "Room management failed" },
      { status: 500 },
    );
  }
}
