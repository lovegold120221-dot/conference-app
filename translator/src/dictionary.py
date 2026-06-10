"""Phrasebook dictionary for low-resource language translation.

Each entry maps a normalised English phrase to its translation in the
target language. The lookup is case- and punctuation-insensitive.

Sources
-------
- Glosbe (glosbe.com/en/byv/) — community-contributed English→Medumba
- Kemelang (kemelang.com/medumba/) — French→Medumba reference
- SIL Cameroon — published Medumba word lists

If you add entries, please include a ``# source:`` comment so we can trace
the provenance.
"""

from __future__ import annotations

import logging
import re
from typing import Final

logger = logging.getLogger("translator.dictionary")

# ── Normalisation helpers ──────────────────────────────────────────────

_PUNCTUATION_RE: Final[re.Pattern[str]] = re.compile(r"[^\w\s']+")
_WHITESPACE_RE: Final[re.Pattern[str]] = re.compile(r"\s+")


def _normalise(phrase: str) -> str:
    """Lower-case, strip punctuation, collapse whitespace."""
    return _WHITESPACE_RE.sub(
        " ",
        _PUNCTUATION_RE.sub(" ", phrase.lower()),
    ).strip()


# ── Medumba (byv) phrasebook ───────────────────────────────────────────
# All entries in this dict map normalised English → Medumba text.
# The Medumba orthography uses the Latin alphabet with IPA extensions
# (ə, ɛ, ɔ, ɯ, ɲ, ŋ, ʉ) and tone marks.

MEDUMBA_PHRASEBOOK: dict[str, str] = {
    # ── Greetings ────────────────────────────────────────────────────
    "hello": "andʒɯkɯ",  # source: Glosbe
    "hi": "andʒɯkɯ",  # source: Glosbe (same as hello)
    "good morning": "ʙo ntwì",  # source: inferred from "good" + context
    "good afternoon": "ʙo nkàm",  # source: inferred from "good" + context
    "good evening": "ʙo nkàm",  # source: inferred from "good" + context
    "good": "ʙo",  # source: Glosbe
    "very good": "a bwɔ̌ tα",  # source: Kemelang ("c'est très bien")
    "excellent": "a bwɔ̌ ncʉα̂tə",  # source: Kemelang ("c'est excellent")
    "welcome": "a bwɔ̌ nə sɯʔɯ",  # source: composite (lit. "it's good to come")
    "how are you": "a bwɔ̌",  # source: Kemelang (used as greeting)
    "fine": "ʙo",  # source: Glosbe

    # ── Conference & meeting ─────────────────────────────────────────
    "start": "bə̀ntə̌ ndα",  # source: composite (lit. "begin the house/session")
    "let's start": "bə̀ntə̌ ndα",  # source: composite
    "next": "bə̀lə",  # source: inferred from context
    "agenda": "bàg nə bàg",  # source: composite (lit. "part after part")
    "item": "bàg",  # source: Kemelang (part)
    "discuss": "bàgtə̌",  # source: Kemelang (expliquer / explain)
    "explain": "bàgtə̌",  # source: Kemelang ("expliquer")
    "question": "bɛdtə̀",  # source: Kemelang ("question" noun)
    "ask": "bɛdtə",  # source: Kemelang ("demander / questionner")
    "answer": "bɛdtə̀ nə vʉ̀",  # source: composite
    "correct": "a vʉ̀ lαg",  # source: Kemelang ("c'est correct")
    "agree": "bamə",  # source: Kemelang ("accepter / approuver")
    "approve": "bamə",  # source: Kemelang ("approuver")
    "thank": "bamə",  # source: Kemelang ("remercier")
    "thank you": "bamə ncʉα̂tə",  # source: composite (lit. "thank great")
    "thanks": "bamə",  # source: Kemelang
    "please": "nəco'o",  # source: Glosbe
    "sorry": "a fi tsə",  # source: Kemelang expression
    "wait": "bebə",  # source: Kemelang ("attendre")
    "speak": "nə tʃuptə",  # source: Glosbe
    "say": "nə tʃuptə",  # source: Glosbe
    "talk": "nə tʃuptə",  # source: Glosbe
    "listen": "bèlə",  # source: Kemelang ("suivre / observer")
    "hear": "bèlə",  # source: Kemelang
    "come": "nə sɯʔɯ",  # source: Glosbe
    "go": "bɛ̀nə",  # source: composite

    # ── Responses ────────────────────────────────────────────────────
    "yes": "ɛ̀hɛ̀",  # source: common Bamileke affirmation
    "no": "tɛ́",  # source: common Bamileke negation
    "okay": "a bwɔ̌",  # source: Kemelang ("c'est bien")
    "ok": "a bwɔ̌",  # source: Kemelang

    # ── Technical / conference features ──────────────────────────────
    "mute": "bɛ̀nə ncu",  # source: composite (lit. "close mouth")
    "unmute": "bə̀nə ncu",  # source: composite (lit. "open mouth")
    "camera": "lαg",  # source: Kemelang ("oeil")
    "video": "lαg",  # source: Kemelang
    "screen": "bà', bǎgɲwà'nì",  # source: composite (house + page)
    "share": "bàgtə̌",  # source: Kemelang (expliquer, also used for "show")
    "raise hand": "bə̀nə bɔ̀",  # source: composite
    "chat": "nə tʃuptə",  # source: Glosbe (speak, also used for chat)
    "leave": "bɛ̀nə",  # source: Kemelang ("partir / retourner")
    "end": "bə'tə",  # source: Kemelang ("casser / terminer")
    "stop": "bə'tə",  # source: Kemelang ("arrêter")

    # ── Time & sequence ──────────────────────────────────────────────
    "now": "ntɑ̌",  # source: inferred
    "later": "nə̀nə̀ nə",  # source: inferred
    "first": "bə'nə ntαnə",  # source: Kemelang ("être le premier")
    "last": "bə̀lə bə̀nə",  # source: composite
    "minute": "bàm nə fʉ̀",  # source: composite
    "time": "ntɑ̌",  # source: inferred from SIL word lists
    "today": "ntɑ̌ nə",  # source: composite

    # ── Politeness & social ──────────────────────────────────────────
    "well done": "a bwɔ̌ tα",  # source: Kemelang ("c'est très bien")
    "congratulations": "bamə ncʉα̂tə",  # source: composite
    "goodbye": "bɛ̀nə ʙo",  # source: composite
    "bye": "bɛ̀nə ʙo",  # source: composite
    "see you": "bɛ̀nə ʙo",  # source: composite
    "sure": "bamə ntsə",  # source: composite
    "of course": "bamə ntsə",  # source: composite
    "really": "bamə ntsə",  # source: composite

    # ── People ───────────────────────────────────────────────────────
    "everyone": "bə bəbə",  # source: composite (lit. "all people")
    "people": "bəbə",  # source: inferred
    "friend": "nswɛn",  # source: inferred from SIL resources
    "colleague": "nswɛn nə ndα",  # source: composite
}

# ── Lookup ─────────────────────────────────────────────────────────────

# Pre-compute normalised keys for fast lookup.
_MEDUMBA_LOOKUP: dict[str, str] = {
    _normalise(k): v for k, v in MEDUMBA_PHRASEBOOK.items()
}


def lookup_medumba(phrase: str) -> str | None:
    """Look up an English phrase in the Medumba dictionary.

    Returns the Medumba translation, or ``None`` if no match is found.
    The lookup is case-insensitive and ignores punctuation.
    """
    key = _normalise(phrase)
    if key in _MEDUMBA_LOOKUP:
        return _MEDUMBA_LOOKUP[key]

    # Try progressively shorter slices (last N words) for suffix matches.
    words = key.split()
    for end in range(len(words) - 1, 0, -1):
        sub = " ".join(words[end:])
        if sub in _MEDUMBA_LOOKUP:
            return _MEDUMBA_LOOKUP[sub]

    return None
