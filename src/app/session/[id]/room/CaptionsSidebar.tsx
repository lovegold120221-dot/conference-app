"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useRemoteParticipants,
  useTextStream,
} from "@livekit/components-react";
import { getLanguageByCode } from "@/lib/languages";

const TRANSLATION_TOPIC = "lk.translation";

/** Small speaker icon SVG */
function SpeakerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <path d="M19.07 4.93a10 10 0 010 14.14" />
      <path d="M15.54 8.46a5 5 0 010 7.07" />
    </svg>
  );
}

/**
 * Speak the given text using the Web Speech API in the target language.
 * Returns a cleanup function that cancels the utterance.
 */
function speak(text: string, langCode: string): () => void {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return () => {};
  }
  // Normalise lang codes: "nl-BE" -> "nl-BE", "zh-TW" -> "zh-TW"
  // Map a few codes that the Web Speech API might not recognise natively.
  const langMap: Record<string, string> = {
    "zh": "zh-CN",
    "zh-TW": "zh-TW",
    "fil": "fil-PH",
    "jv": "jv-ID",
    "mni-Mtei": "mni",
  };
  const voiceLang = langMap[langCode] || langCode;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voiceLang;
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  // Try to find a matching voice for the language.
  const voices = window.speechSynthesis.getVoices();
  const matching = voices.find((v) => v.lang.startsWith(voiceLang));
  if (matching) utterance.voice = matching;

  window.speechSynthesis.speak(utterance);

  return () => {
    window.speechSynthesis.cancel();
  };
}

export default function CaptionsSidebar({
  open,
  onClose,
  myLang,
  peerLangs,
}: {
  open: boolean;
  onClose: () => void;
  myLang: string;
  peerLangs: Map<string, string | undefined>;
}) {
  const { textStreams } = useTextStream(TRANSLATION_TOPIC);
  const remotes = useRemoteParticipants();
  const bodyRef = useRef<HTMLDivElement | null>(null);

  // Track which entry is currently speaking via TTS.
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  // Map identity -> display name
  const names = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of remotes) {
      map.set(p.identity, p.name || p.identity);
    }
    return map;
  }, [remotes]);

  // Each TextStream is one append from the agent. Group chunks into one entry
  // per *utterance*: append chunks from the same speaker into the entry that's
  // currently "open" for that speaker, and seal it when the agent sends a
  // `final="true"` boundary marker (one is emitted on every Gemini
  // `turnComplete`). The next non-final chunk from the same speaker then
  // starts a fresh entry — one utterance per line.
  const entries = useMemo(() => {
    const matching = textStreams
      .filter((s) => s.streamInfo.attributes?.target_lang === myLang)
      .sort((a, b) => a.streamInfo.timestamp - b.streamInfo.timestamp);

    type Entry = {
      key: string;
      sourceIdentity: string;
      text: string;
      sourceLang: string | undefined;
    };
    const out: Entry[] = [];
    const openIdxBySource = new Map<string, number>();

    for (const s of matching) {
      const source =
        s.streamInfo.attributes?.source_identity ?? s.participantInfo.identity;
      const isFinal = s.streamInfo.attributes?.final === "true";
      const text = s.text.trim();

      // Final markers carry empty text from the agent, but defensively flush
      // any text into the open entry before sealing the utterance.
      if (isFinal) {
        if (text) {
          const idx = openIdxBySource.get(source);
          if (idx !== undefined) {
            out[idx].text = `${out[idx].text} ${text}`.trim();
          } else {
            out.push({
              key: s.streamInfo.id,
              sourceIdentity: source,
              text,
              sourceLang: peerLangs.get(source),
            });
          }
        }
        openIdxBySource.delete(source);
        continue;
      }

      if (!text) continue;

      const openIdx = openIdxBySource.get(source);
      if (openIdx !== undefined) {
        out[openIdx].text = `${out[openIdx].text} ${text}`.trim();
      } else {
        out.push({
          key: s.streamInfo.id,
          sourceIdentity: source,
          text,
          sourceLang: peerLangs.get(source),
        });
        openIdxBySource.set(source, out.length - 1);
      }
    }
    return out;
  }, [textStreams, myLang, peerLangs]);

  // Auto-scroll on new entries.
  useEffect(() => {
    if (!open || !bodyRef.current) return;
    bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [entries, open]);

  // Clean up speech on unmount.
  useEffect(() => {
    return () => {
      if (cancelRef.current) cancelRef.current();
    };
  }, []);

  const handleSpeak = useCallback(
    (key: string, text: string) => {
      // If already speaking this entry, cancel.
      if (speakingKey === key) {
        if (cancelRef.current) cancelRef.current();
        setSpeakingKey(null);
        return;
      }
      // Cancel any previous utterance.
      if (cancelRef.current) cancelRef.current();
      setSpeakingKey(key);
      cancelRef.current = speak(text, myLang);
      // Auto-reset when done.
      const checkDone = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearInterval(checkDone);
          setSpeakingKey(null);
          cancelRef.current = null;
        }
      }, 200);
    },
    [speakingKey, myLang],
  );

  const myLangInfo = getLanguageByCode(myLang);

  return (
    <aside
      className={`captions${open ? " open" : ""}`}
      aria-hidden={!open}
    >
      {/* Inner has a fixed width so the outer can animate its width 0 -> 380px
          without the content reflowing / squishing along the way. */}
      <div className="captions-inner">
        <div className="captions-header">
          <span>
            Captions {myLangInfo && `· ${myLangInfo.flag} ${myLangInfo.name}`}
          </span>
          <button
            className="captions-close"
            onClick={onClose}
            aria-label="Close captions"
          >
            Close
          </button>
        </div>
        <div ref={bodyRef} className="captions-body">
          {entries.length === 0 ? (
            <div className="captions-empty">
              No captions yet. Translation transcripts will appear here as
              people speak.
            </div>
          ) : (
            entries.map((entry) => (
              <div className="captions-entry" key={entry.key}>
                <div className="captions-entry-top">
                  <div className="captions-speaker">
                    <span className="captions-speaker-name">
                      {names.get(entry.sourceIdentity) ?? entry.sourceIdentity}
                    </span>
                    {entry.sourceLang && (
                      <span className="captions-speaker-lang">
                        {entry.sourceLang} → {myLang}
                      </span>
                    )}
                  </div>
                  <button
                    className={`captions-speak-btn${speakingKey === entry.key ? " speaking" : ""}`}
                    onClick={() => handleSpeak(entry.key, entry.text)}
                    aria-label={speakingKey === entry.key ? "Stop speaking" : "Read aloud"}
                    title={speakingKey === entry.key ? "Stop" : "Read aloud"}
                  >
                    <SpeakerIcon />
                  </button>
                </div>
                <p className="captions-text">{entry.text}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
