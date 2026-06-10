"""Constants for the translation agent."""

from __future__ import annotations

# --- Gemini Live ---

GEMINI_MODEL = "gemini-3.5-live-translate-preview"

# Gemini Live API audio formats.
GEMINI_INPUT_SAMPLE_RATE = 16000  # Gemini expects 16kHz mono PCM in
GEMINI_OUTPUT_SAMPLE_RATE = 24000  # Gemini emits 24kHz mono PCM out
AUDIO_CHANNELS = 1

# --- LiveKit ---

# Track attribute keys for translator-published tracks.
TRACK_ATTR_KIND = "kind"
TRACK_ATTR_SOURCE_IDENTITY = "source_identity"
TRACK_ATTR_TARGET_LANG = "target_lang"

# Marker value for the `kind` attribute on translator tracks.
TRANSLATION_TRACK_KIND = "translation"

# Participant attribute carrying each participant's chosen language.
PARTICIPANT_LANG_ATTR = "lang"

# Sentinel meaning "no translation, native passthrough."
NATIVE_LANG = "none"

# --- Router behavior ---

# Debounce window for room state changes before reconciling sessions.
RECONCILE_DEBOUNCE_SEC = 0.25

# How long to keep a session warm after its last demand disappears
# (speaker mutes, or the last listener for a target language leaves).
SESSION_GRACE_SEC = 10.0

# --- Gemini connection ---

# Map regional language codes to base codes the Gemini Live API accepts.
# The Gemini Live translation model expects standard BCP-47 codes; many
# regional variants (nl-BE, pt-PT, zh-TW, etc.) are not recognised and will
# cause the WebSocket setup to fail silently. Strip the region when present.
# Only exceptions: codes explicitly verified to work on the model should be
# listed here as identity mappings.
_GEMINI_LANG_OVERRIDES: dict[str, str] = {
    # Chinese variants — Gemini expects zh-CN (simplified) and zh-TW (trad)
    # but NOT all BCP-47 codes. Keep zh-TW as-is since verified; anything
    # else "zh-*" maps to zh-CN.
    "zh-TW": "zh-TW",
}

# Codes that use dictionary-based translation (phrasebook) rather than Gemini
# Live API. These are low-resource languages the Gemini model doesn't support
# natively, so we fall back to an ASR → dictionary lookup → TTS pipeline.
DICTIONARY_LANGS: frozenset[str] = frozenset({
    "byv",  # Medumba
})

def gemini_target_lang(code: str) -> str:
    """Return a language code the Gemini Live API accepts for translationConfig.

    Falls back to stripping the region subtag for unknown regional variants
    (e.g. ``nl-BE`` → ``nl``, ``pt-PT`` → ``pt``).

    If *code* is in ``DICTIONARY_LANGS`` the caller must NOT use this value
    for a Gemini Live session; route to a DictionarySession instead.
    """
    if code in _GEMINI_LANG_OVERRIDES:
        return _GEMINI_LANG_OVERRIDES[code]
    # If it's a base code (no hyphen), use as-is.
    if "-" not in code:
        return code
    # Strip the region: "nl-BE" -> "nl", "zh-HK" -> "zh"
    base = code.split("-")[0]
    return base

# Exponential backoff schedule for reconnecting a failed Gemini session.
GEMINI_RECONNECT_BACKOFF_SEC = [0.5, 1.0, 2.0, 4.0, 8.0, 16.0, 30.0]
GEMINI_MAX_FAILURES_BEFORE_LONG_BACKOFF = 5
