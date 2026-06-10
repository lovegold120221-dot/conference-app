"""Dictionary-based translation session for low-resource languages.

Instead of using the Gemini Live API (which doesn't support these languages),
we run a local pipeline: speaker audio → ASR → dictionary lookup → TTS →
published audio track + text captions.

Pipeline
--------
1. Subscribe to the speaker's audio track (AudioStream).
2. Buffer incoming PCM frames.
3. Every FORCED_FLUSH_INTERVAL seconds, flush the buffer to ASR.
4. Send the audio chunk to Voicebox or Gemini for transcription.
5. Normalise and look up the resulting text in the phrasebook.
6. If found: generate TTS audio via Voicebox and push to our AudioSource,
   plus publish a text-stream caption with the Medumba translation.
7. If not found: publish the original text with an "unavailable" note
   and skip audio.
"""

from __future__ import annotations

import asyncio
import io
import json
import logging
import os
import struct
import time
import wave
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Final

import httpx
from livekit import rtc

from audio import make_audio_source, push_pcm_to_source
from config import (
    AUDIO_CHANNELS,
    GEMINI_INPUT_SAMPLE_RATE,
    GEMINI_OUTPUT_SAMPLE_RATE,
    TRACK_ATTR_KIND,
    TRACK_ATTR_SOURCE_IDENTITY,
    TRACK_ATTR_TARGET_LANG,
    TRANSLATION_TRACK_KIND,
)
from dictionary import lookup_medumba

logger = logging.getLogger("translator.dictionary_session")

# ── Constants ──────────────────────────────────────────────────────────

# Voicebox local API (see ~/.agents/skills/voicebox/)
_VOICEBOX_BASE: Final[str] = "http://localhost:17493"

# How long (in seconds) to buffer audio before sending to ASR.
_FORCED_FLUSH_INTERVAL: Final[float] = 3.0

# Silence threshold: if the ASR returns text shorter than this, skip lookup.
_MIN_TRANSCRIPT_LEN: Final[int] = 2

# ── Audio helpers ──────────────────────────────────────────────────────

# Gemini text model used as a transcription fallback.
_GEMINI_TRANSCRIPTION_MODEL: Final[str] = "gemini-2.0-flash"


def _pcm_to_wav_bytes(pcm_bytes: bytes, sample_rate: int = 16000) -> bytes:
    """Wrap raw 16-bit mono PCM into a WAV container (in-memory)."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_bytes)
    return buf.getvalue()


def _wav_to_pcm(wav_bytes: bytes) -> bytes:
    """Extract raw PCM from a WAV blob."""
    with wave.open(io.BytesIO(wav_bytes), "rb") as wf:
        return wf.readframes(wf.getnframes())


def _resample_pcm(
    data: bytes, src_rate: int, dst_rate: int = GEMINI_OUTPUT_SAMPLE_RATE
) -> bytes:
    """Simple linear resample. For production, use a proper DSP library."""
    if src_rate == dst_rate:
        return data

    import array

    samples = array.array("h")
    samples.frombytes(data)
    src_len = len(samples)
    dst_len = int(src_len * dst_rate / src_rate)

    # Crude nearest-neighbour resample.
    out = array.array("h")
    for i in range(dst_len):
        src_idx = int(i * src_rate / dst_rate)
        if src_idx < src_len:
            out.append(samples[src_idx])
    return out.tobytes()


# ── Session ────────────────────────────────────────────────────────────


class DictionarySession:
    """Translates a speaker's audio into a target language via phrasebook.

    Lifecycle:
      - ``start()`` publishes a translator track and begins the pipeline.
      - ``aclose()`` tears everything down. Idempotent.
    """

    def __init__(
        self,
        *,
        room: rtc.Room,
        speaker_identity: str,
        speaker_track: rtc.RemoteAudioTrack,
        target_lang: str,
    ) -> None:
        self._room = room
        self._speaker_identity = speaker_identity
        self._speaker_track = speaker_track
        self._target_lang = target_lang

        # Output audio source (same format as GeminiSession).
        self._audio_source = make_audio_source()
        self._local_track: rtc.LocalAudioTrack | None = None
        self._track_sid: str | None = None
        self._tasks: list[asyncio.Task] = []
        self._closed = asyncio.Event()

        # PCM buffer: accumulates frames between ASR flushes.
        self._pcm_buffer = bytearray()
        self._last_flush = time.monotonic()

        # HTTP client for Voicebox calls.
        self._http = httpx.AsyncClient(base_url=_VOICEBOX_BASE, timeout=30)

        # Preferred profile for TTS (first available, falls back to None).
        self._tts_profile_id: str | None = None

    # ── Public API ─────────────────────────────────────────────────

    async def start(self) -> None:
        """Publish the translator track and start the pipeline."""
        track_name = f"tx:{self._speaker_identity}:{self._target_lang}"
        self._local_track = rtc.LocalAudioTrack.create_audio_track(
            track_name, self._audio_source
        )
        publish_opts = rtc.TrackPublishOptions(
            source=rtc.TrackSource.SOURCE_MICROPHONE
        )
        pub = await self._room.local_participant.publish_track(
            self._local_track, publish_opts
        )
        self._track_sid = pub.sid

        logger.info(
            "started dictionary track sid=%s name=%s for %s -> %s",
            self._track_sid,
            track_name,
            self._speaker_identity,
            self._target_lang,
        )

        # Resolve a TTS profile.
        await self._resolve_tts_profile()

        # Start the pipeline.
        self._tasks.append(
            asyncio.create_task(self._run(), name=f"dict-session/{track_name}")
        )

    async def aclose(self) -> None:
        if self._closed.is_set():
            return
        self._closed.set()

        for task in self._tasks:
            task.cancel()
        for task in self._tasks:
            try:
                await task
            except (asyncio.CancelledError, Exception):
                pass
        self._tasks.clear()

        if self._track_sid:
            try:
                await self._room.local_participant.unpublish_track(self._track_sid)
            except Exception as exc:
                logger.debug("unpublish failed for %s: %s", self._track_sid, exc)

        with self._http:
            pass  # close the client on exit

        with contextlib.suppress(Exception):
            await self._audio_source.aclose()

        logger.info(
            "closed dictionary session for %s -> %s",
            self._speaker_identity,
            self._target_lang,
        )

    # ── TTS profile ────────────────────────────────────────────────

    async def _resolve_tts_profile(self) -> None:
        """Pick the first available Voicebox profile."""
        try:
            resp = await self._http.get("/profiles")
            resp.raise_for_status()
            profiles = resp.json()
            if profiles:
                self._tts_profile_id = profiles[0]["id"]
                logger.info("using TTS profile %s", self._tts_profile_id)
        except Exception as exc:
            logger.warning("could not resolve TTS profile: %s", exc)

    # ── Pipeline ───────────────────────────────────────────────────

    async def _run(self) -> None:
        """Main loop: buffer audio, flush to ASR periodically, look up, speak."""
        # NB: we use the same AudioStream pattern as GeminiSession,
        # but instead of forwarding frames to a WS, we accumulate them.
        stream = rtc.AudioStream(
            self._speaker_track,
            sample_rate=GEMINI_INPUT_SAMPLE_RATE,
            num_channels=AUDIO_CHANNELS,
        )
        try:
            async for ev in stream:
                if self._closed.is_set():
                    return
                self._pcm_buffer.extend(bytes(ev.frame.data))

                # Flush every _FORCED_FLUSH_INTERVAL seconds of real time
                # (not wall time — but good enough for a phrasebook).
                now = time.monotonic()
                elapsed = now - self._last_flush
                if elapsed >= _FORCED_FLUSH_INTERVAL and len(self._pcm_buffer) > 0:
                    chunk = bytes(self._pcm_buffer)
                    self._pcm_buffer.clear()
                    self._last_flush = now
                    asyncio.create_task(self._process_chunk(chunk))
        finally:
            await stream.aclose()

    async def _process_chunk(self, pcm_chunk: bytes) -> None:
        """Transcribe → lookup → TTS → publish for one audio chunk."""
        try:
            transcript = await self._transcribe(pcm_chunk)
        except Exception as exc:
            logger.debug("ASR failed for %s chunk: %s", self._speaker_identity, exc)
            return

        if not transcript or len(transcript) < _MIN_TRANSCRIPT_LEN:
            return  # silence or noise

        transcript = transcript.strip()
        logger.info(
            "asr -> %s %r", self._speaker_identity, transcript[:120]
        )

        # Look up in dictionary.
        translation = lookup_medumba(transcript)
        if translation:
            logger.info(
                "dict hit: %r -> %r", transcript[:80], translation[:80]
            )
            # Publish text caption with the translation.
            await self._publish_transcript(translation, final=True)
            # Generate TTS audio.
            await self._speak_translation(translation)
        else:
            logger.info(
                "dict miss: %r (no translation in phrasebook)", transcript[:80]
            )
            # Publish original text with a note that translation is unavailable.
            note = f"[Medumba: {transcript}]"
            await self._publish_transcript(note, final=True)
            # Skip TTS — no audio for untranslated phrases.

    # ── ASR ────────────────────────────────────────────────────────

    async def _transcribe(self, pcm_chunk: bytes) -> str:
        """Transcribe audio chunk to text.

        Tries Voicebox first, then falls back to Gemini text model.
        """
        text = await self._transcribe_via_voicebox(pcm_chunk)
        if text:
            return text
        return await self._transcribe_via_gemini(pcm_chunk)

    async def _transcribe_via_voicebox(self, pcm_chunk: bytes) -> str:
        """Send PCM to Voicebox's /transcribe endpoint."""
        try:
            wav = _pcm_to_wav_bytes(pcm_chunk, GEMINI_INPUT_SAMPLE_RATE)
            resp = await self._http.post(
                "/transcribe",
                files={"file": ("audio.wav", wav, "audio/wav")},
            )
            resp.raise_for_status()
            data = resp.json()
            # Voicebox returns {"text": "..."} or {"detail": "..."}
            return data.get("text") or data.get("detail") or ""
        except Exception as exc:
            logger.debug("voicebox ASR failed: %s", exc)
            return ""

    async def _transcribe_via_gemini(self, pcm_chunk: bytes) -> str:
        """Fallback: use Gemini text model for transcription."""
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            logger.debug("no GEMINI_API_KEY for Gemini ASR fallback")
            return ""

        try:
            from google import genai

            client = genai.Client(api_key=api_key)
            wav = _pcm_to_wav_bytes(pcm_chunk, GEMINI_INPUT_SAMPLE_RATE)
            import base64

            b64 = base64.b64encode(wav).decode("ascii")

            response = client.models.generate_content(
                model=_GEMINI_TRANSCRIPTION_MODEL,
                contents=[
                    "Transcribe the speech in this audio accurately.",
                    {
                        "inline_data": {
                            "mime_type": "audio/wav",
                            "data": b64,
                        }
                    },
                ],
            )
            return response.text or ""
        except Exception as exc:
            logger.debug("Gemini ASR failed: %s", exc)
            return ""

    # ── TTS ────────────────────────────────────────────────────────

    async def _speak_translation(self, text: str) -> None:
        """Generate TTS audio for the Medumba text and push to the room."""
        if not self._tts_profile_id:
            logger.debug("no TTS profile available; skipping audio")
            return

        try:
            resp = await self._http.post(
                "/generate",
                json={
                    "text": text,
                    "profile_id": self._tts_profile_id,
                    "language": "en",  # Voicebox uses English phonemes
                },
            )
            resp.raise_for_status()
            # Voicebox returns the WAV bytes directly.
            wav_bytes = resp.content
            if not wav_bytes:
                return

            # Convert WAV to 24kHz mono PCM.
            pcm = _wav_to_pcm(wav_bytes)
            pcm = _resample_pcm(pcm, src_rate=24000, dst_rate=GEMINI_OUTPUT_SAMPLE_RATE)

            # Push to our audio source in chunks (20ms frames).
            frame_size = int(GEMINI_OUTPUT_SAMPLE_RATE * 0.02)  # 20ms @ 24kHz = 480
            for i in range(0, len(pcm), frame_size * 2):  # 16-bit = 2 bytes per sample
                chunk = pcm[i : i + frame_size * 2]
                if len(chunk) < 4:
                    continue
                await push_pcm_to_source(self._audio_source, chunk)

            logger.info(
                "tts -> %s (%d bytes pcm)", self._target_lang, len(pcm)
            )
        except Exception as exc:
            logger.warning("TTS failed for %s: %s", self._target_lang, exc)

    # ── Text captions ──────────────────────────────────────────────

    async def _publish_transcript(self, text: str, *, final: bool) -> None:
        """Publish a text-stream message (same format as GeminiSession)."""
        if not text and not final:
            return
        try:
            writer = await self._room.local_participant.stream_text(
                topic="lk.translation",
                sender_identity=self._speaker_identity,
                attributes={
                    "target_lang": self._target_lang,
                    "source_identity": self._speaker_identity,
                    "final": "true" if final else "false",
                },
            )
            if text:
                await writer.write(text)
            await writer.aclose()
        except Exception as exc:
            logger.debug("text-stream publish failed: %s", exc)


import contextlib  # noqa: E402 (needed for aclose)
