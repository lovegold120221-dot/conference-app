"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useRemoteParticipants,
  useTextStream,
} from "@livekit/components-react";
import { getLanguageByCode } from "@/lib/languages";

const TRANSLATION_TOPIC = "lk.translation";

type Tab = "chat" | "polls" | "captions";

function SmileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function MessageSquareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function CaptionsTabIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <path d="M7 10.5a1.5 1.5 0 0 1 3 0" />
      <path d="M7 13.5a1.5 1.5 0 0 1 3 0" />
      <path d="M14 10.5a1.5 1.5 0 0 1 3 0" />
      <path d="M14 13.5a1.5 1.5 0 0 1 3 0" />
    </svg>
  );
}

function PieChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.21 15.89A10 10 0 118 2.83" />
      <path d="M22 12A10 10 0 0012 2v10z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SpeakerSmallIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function speak(text: string, langCode: string): () => void {
  if (typeof window === "undefined" || !window.speechSynthesis) return () => {};
  const langMap: Record<string, string> = {
    "zh": "zh-CN", "zh-TW": "zh-TW", "fil": "fil-PH",
    "jv": "jv-ID", "mni-Mtei": "mni",
  };
  const voiceLang = langMap[langCode] || langCode;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voiceLang;
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  const voices = window.speechSynthesis.getVoices();
  const matching = voices.find((v) => v.lang.startsWith(voiceLang));
  if (matching) utterance.voice = matching;
  window.speechSynthesis.speak(utterance);
  return () => { window.speechSynthesis.cancel(); };
}

export default function ChatSidebar({
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
  const [activeTab, setActiveTab] = useState<Tab>("captions");
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const names = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of remotes) {
      map.set(p.identity, p.name || p.identity);
    }
    return map;
  }, [remotes]);

  // ── Captions entries ──
  const entries = useMemo(() => {
    const matching = textStreams
      .filter((s) => s.streamInfo.attributes?.target_lang === myLang)
      .sort((a, b) => a.streamInfo.timestamp - b.streamInfo.timestamp);

    type Entry = { key: string; sourceIdentity: string; text: string; sourceLang: string | undefined };
    const out: Entry[] = [];
    const openIdxBySource = new Map<string, number>();

    for (const s of matching) {
      const source = s.streamInfo.attributes?.source_identity ?? s.participantInfo.identity;
      const isFinal = s.streamInfo.attributes?.final === "true";
      const text = s.text.trim();

      if (isFinal) {
        if (text) {
          const idx = openIdxBySource.get(source);
          if (idx !== undefined) {
            out[idx].text = `${out[idx].text} ${text}`.trim();
          } else {
            out.push({ key: s.streamInfo.id, sourceIdentity: source, text, sourceLang: peerLangs.get(source) });
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
        out.push({ key: s.streamInfo.id, sourceIdentity: source, text, sourceLang: peerLangs.get(source) });
        openIdxBySource.set(source, out.length - 1);
      }
    }
    return out;
  }, [textStreams, myLang, peerLangs]);

  useEffect(() => {
    if (!open || !bodyRef.current) return;
    bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [entries, open]);

  useEffect(() => {
    return () => { if (cancelRef.current) cancelRef.current(); };
  }, []);

  const handleSpeak = useCallback((key: string, text: string) => {
    if (speakingKey === key) {
      if (cancelRef.current) cancelRef.current();
      setSpeakingKey(null);
      return;
    }
    if (cancelRef.current) cancelRef.current();
    setSpeakingKey(key);
    cancelRef.current = speak(text, myLang);
    const checkDone = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        clearInterval(checkDone);
        setSpeakingKey(null);
        cancelRef.current = null;
      }
    }, 200);
  }, [speakingKey, myLang]);

  const myLangInfo = getLanguageByCode(myLang);
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "chat", label: "Chat", icon: <MessageSquareIcon /> },
    { id: "polls", label: "Polls", icon: <BarChartIcon /> },
    { id: "captions", label: "Captions", icon: <CaptionsTabIcon /> },
  ];

  return (
    <aside className={`sidebar-left${open ? "" : " hidden"}`}>
      {/* Tabs */}
      <div className="sidebar-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`sidebar-tab${activeTab === tab.id ? " active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
        <button className="sidebar-close" onClick={onClose} aria-label="Close sidebar">
          <XIcon />
        </button>
      </div>

      <div className="sidebar-content">
        {/* ── Chat Panel ── */}
        <div className={`sidebar-panel${activeTab === "chat" ? "" : " hidden"}`}>
          <div className="chat-messages">
            <div className="chat-msg">
              <div className="chat-msg-header">
                <span className="chat-msg-author">System Security</span>
                <span className="chat-msg-time">Just now</span>
              </div>
              <p className="chat-msg-text">
                End-to-End Encryption is active. No unauthorized users can join.
              </p>
            </div>
          </div>
          <div className="chat-input-bar">
            <div className="chat-input-wrap">
              <button className="chat-send-btn" title="Emoji">
                <SmileIcon />
              </button>
              <input
                type="text"
                placeholder="Send a message..."
                className="chat-input"
              />
              <button className="chat-send-btn" title="Send">
                <SendIcon />
              </button>
            </div>
          </div>
        </div>

        {/* ── Polls Panel ── */}
        <div className={`sidebar-panel${activeTab === "polls" ? "" : " hidden"}`}>
          <div className="polls-empty">
            <div className="polls-empty-icon">
              <PieChartIcon />
            </div>
            <p className="polls-empty-title">No active polls</p>
            <p className="polls-empty-desc">Create a poll to engage participants.</p>
          </div>
          <div className="polls-footer">
            <button className="polls-create-btn">Create New Poll</button>
          </div>
        </div>

        {/* ── Captions Panel ── */}
        <div className={`sidebar-panel${activeTab === "captions" ? "" : " hidden"}`}>
          <div ref={bodyRef} className="captions-panel">
            {entries.length === 0 ? (
              <div className="captions-empty">
                No captions yet. Translation transcripts will appear here as people speak.
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
                          {entry.sourceLang} {myLangInfo?.flag && `· ${myLangInfo.flag}`}
                        </span>
                      )}
                    </div>
                    <button
                      className={`captions-speak-btn${speakingKey === entry.key ? " speaking" : ""}`}
                      onClick={() => handleSpeak(entry.key, entry.text)}
                      aria-label={speakingKey === entry.key ? "Stop" : "Read aloud"}
                    >
                      <SpeakerSmallIcon />
                    </button>
                  </div>
                  <p className="captions-text">{entry.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
