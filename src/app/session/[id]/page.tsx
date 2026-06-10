"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PICKER_LANGUAGES } from "@/lib/languages";

const STORAGE_KEY_NAME = "lt.displayName";
const STORAGE_KEY_LANG = "lt.lang";

export default function PreFlightPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [lang, setLang] = useState<string>("en");
  const [shareCopied, setShareCopied] = useState(false);

  // Restore last-used name + language so returning users skip retyping.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedName = window.sessionStorage.getItem(STORAGE_KEY_NAME);
    const savedLang = window.sessionStorage.getItem(STORAGE_KEY_LANG);
    if (savedName) setDisplayName(savedName);
    if (savedLang) setLang(savedLang);
  }, []);

  function handleJoin() {
    if (!displayName.trim()) return;
    window.sessionStorage.setItem(STORAGE_KEY_NAME, displayName.trim());
    window.sessionStorage.setItem(STORAGE_KEY_LANG, lang);
    router.push(`/session/${id}/room`);
  }

  async function copyInviteLink() {
    const url = `${window.location.origin}/session/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // ignored
    }
  }

  return (
    <div className="page">
      <div className="container">
        <h1 className="display display-lg enter" style={{ marginBottom: 10 }}>
          Join the call
        </h1>
        <p
          className="body enter-d1"
          style={{ marginBottom: 36 }}
        >
          Pick your language — that&apos;s what you&apos;ll speak and what you&apos;ll
          hear everyone else in.
        </p>

        <div className="enter-d2" style={{ display: "flex", flexDirection: "column", gap: 24, marginBottom: 36 }}>
          <label className="label" style={{ display: "block" }}>
            Your name
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Jesse"
              autoFocus
              className="input-field"
              style={{ marginTop: 8, fontWeight: 500 }}
              maxLength={40}
            />
          </label>

          <label className="label" style={{ display: "block" }}>
            Language
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="select-field"
              style={{ marginTop: 8, fontWeight: 500 }}
            >
              {PICKER_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="enter-d3" style={{ display: "flex", gap: 10, flexDirection: "column" }}>
          <button
            className="btn btn-dark"
            onClick={handleJoin}
            disabled={!displayName.trim()}
            id="join-btn"
          >
            Join the call
          </button>
          <button
            className="btn btn-outline"
            onClick={copyInviteLink}
          >
            {shareCopied ? "Link copied!" : "Copy invite link"}
          </button>
        </div>

        <p className="mono enter-d4" style={{ marginTop: 36, textAlign: "center" }}>
          Camera and mic stay off until you turn them on.
        </p>
      </div>
    </div>
  );
}
