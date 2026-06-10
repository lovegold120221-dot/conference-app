/**
 * Translation routing logic.
 *
 * Determines whether a given audio source should be translated for a given
 * listener. This is the single source of truth for the "do not translate
 * my own mic back to me" rule AND the "do translate my own screen-share
 * audio back to me" rule.
 *
 * Exported as a pure function so it can be unit-tested without any
 * LiveKit or React dependencies.
 */

// ── Types ────────────────────────────────────────────────────────────

export type AudioSourceType = "microphone" | "screen-share-audio";

export interface ShouldTranslateParams {
  /** The participant who would be listening to the translation. */
  listenerParticipantId: string;
  /** The participant who owns the source audio. */
  sourceOwnerParticipantId: string;
  /** What kind of audio source this is. */
  sourceType: AudioSourceType;
}

// ── Routing function ─────────────────────────────────────────────────

/**
 * Decide whether `sourceOwnerParticipantId`'s audio of `sourceType`
 * should be translated and played back to `listenerParticipantId`.
 *
 * Rules (per the translation routing matrix):
 *  1. Own microphone → NEVER translate back (echo rule).
 *  2. Own screen-share audio → ALWAYS translate back.
 *  3. Any remote audio → ALWAYS translate.
 */
export function shouldTranslateForListener(
  params: ShouldTranslateParams,
): boolean {
  const isOwnSource =
    params.listenerParticipantId === params.sourceOwnerParticipantId;

  // The iron rule: never echo the listener's own microphone back.
  if (isOwnSource && params.sourceType === "microphone") {
    return false;
  }

  // Everything else: remote mic, remote screen-share, own screen-share.
  return true;
}
