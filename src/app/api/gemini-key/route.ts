import { NextResponse } from "next/server";

/**
 * Returns the Gemini API key to the client at runtime (not bundled).
 *
 * Security note: In production, restrict the API key in Google AI Studio
 * to your deployment domain. This route also supports adding referrer
 * checks or authentication later without changing the client.
 */
export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured on server" },
      { status: 500 },
    );
  }

  return NextResponse.json({ apiKey });
}
