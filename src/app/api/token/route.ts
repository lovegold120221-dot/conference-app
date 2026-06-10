import { NextRequest, NextResponse } from "next/server";
import { AccessToken, RoomConfiguration } from "livekit-server-sdk";
import { TrackSource } from "@livekit/protocol";

// Session caps (mirrors src/lib/config.ts on the client). Hardcoded here to
// avoid a runtime import cycle; keep these in sync if you change them in one place.
const SESSION_TTL_SECONDS = 4 * 60 * 60; // 4h hard cap per grill Q21
const EMPTY_ROOM_TIMEOUT = 60; // close empty rooms after 60s
const DEPARTURE_TIMEOUT = 30; // close after last person leaves
const MAX_PARTICIPANTS = 8; // room cap per grill Q21

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get("room");
  const identity = req.nextUrl.searchParams.get("identity");
  const displayName =
    req.nextUrl.searchParams.get("name")?.trim() || identity || "";
  const isHost = req.nextUrl.searchParams.get("host") === "true";

  if (!room || !identity) {
    return NextResponse.json(
      { error: "Missing room or identity parameter" },
      { status: 400 },
    );
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const serverUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !serverUrl) {
    return NextResponse.json(
      { error: "LiveKit credentials not configured" },
      { status: 500 },
    );
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name: displayName,
    ttl: SESSION_TTL_SECONDS,
    metadata: JSON.stringify({ role: isHost ? "host" : "participant" }),
  });

  // Peer model: every participant can publish audio + video and
  // subscribe; can update their own attributes (used to broadcast their
  // chosen language to the agent + other peers).
  // Hosts get additional admin capabilities.
  const grant: Record<string, unknown> = {
    roomJoin: true,
    room,
    roomAdmin: isHost,
    roomCreate: isHost,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
    canUpdateOwnMetadata: true,
  };

  // Allow publishing camera, microphone, and screen_share
  if (isHost) {
    grant.canPublishSources = [
      TrackSource.CAMERA,
      TrackSource.MICROPHONE,
      TrackSource.SCREEN_SHARE,
    ];
  }

  at.addGrant(grant);

  // Room lifecycle config — no agent dispatch needed (translation runs
  // client-side via each browser's own Gemini Live session).
  at.roomConfig = new RoomConfiguration({
    emptyTimeout: EMPTY_ROOM_TIMEOUT,
    departureTimeout: DEPARTURE_TIMEOUT,
    maxParticipants: MAX_PARTICIPANTS,
  });

  const token = await at.toJwt();

  return NextResponse.json({ token, serverUrl, role: isHost ? "host" : "participant" });
}
