## TASK-20260610-001: Fix entry page & settings page

### START RECORD
- STATUS: COMPLETED
- Start time: 2026-06-10
- User request: "fix the entry page and the settings page"
- Files inspected: `src/app/page.tsx`, `src/app/session/[id]/page.tsx`, `src/app/globals.css`
- Success criteria: Both pages render correctly with Orbit Premium styling, build passes

### WHAT WAS WRONG
The entry page (`/`) and session prejoin/settings page (`/session/[id]`) used custom CSS class names (`.page`, `.container`, `.btn`, `.btn-dark`, `.btn-outline`, `.label`, `.input-field`, `.select-field`, `.display`, `.body`, `.mono`, `.spinner`, `.rule`) that were **never defined** in any CSS file. These were just raw class names with inline `style` overrides — the pages were effectively unstyled.

### FINAL REPORT
- **Files changed:**
  - `src/app/globals.css` — added ~150 lines of page utility classes:
    - `.page` — full-screen centered flex layout with Orbit gradient bg
    - `.container` — 480px max-width wrapper
    - `.display`, `.display-xl`, `.display-lg`, `.display-md` — light-weighted headings
    - `.body`, `.mono` — body and monospace text
    - `.btn`, `.btn-dark`, `.btn-outline` — Orbit Premium buttons (gold gradient, glass outline)
    - `.label`, `.input-field`, `.select-field` — form elements with dark inset bg, gold focus
    - `.spinner` — gold-accent loading spinner
    - `.rule` — border divider
    - `.enter`, `.enter-d1`–`.enter-d4` — staggered entrance animations
  - `src/app/page.tsx` — redesigned with:
    - Orbit Premium logo (ring + dot) centered at top
    - "Powered by Eburon AI" eyebrow
    - Gold gradient "Start a conference" CTA
    - 3-step feature list with dashed dividers
    - Staggered entrance animations on all sections
  - `src/app/session/[id]/page.tsx` — **full redesign to match Orbit Premium prejoin reference:**
    - Header: Orbit logo + brand name
    - 2-column grid layout (camera preview | settings)
    - Camera preview with avatar placeholder (shows name initials), "Camera Preview" badge, device dock with mic/camera toggles
    - Settings column: name input with user icon, language select with globe icon, gold "Join the call" button, glass "Copy invite link" button
    - Privacy note at bottom
- **Validation:** `npm run build` — compiled in ~1s, TypeScript passed, all 6 routes generated
- **Dev server:** Running at `http://localhost:3000` (HTTP 200 on both pages)

### FILES CHANGED SUMMARY
| File | What |
|---|---|
| `src/app/globals.css` | +150 lines page utility classes |
| `src/app/page.tsx` | Polished landing page with logo, gold CTA, staggered animations |
| `src/app/session/[id]/page.tsx` | Full Orbit Premium prejoin: 2-col layout, camera preview, device dock, name/lang form |
| `TASK.md` | Updated |

### PREVIOUS STATE (for comparison)
- The entry page had raw class names with no CSS backing — only inline styles provided minimal visuals
- The settings page was a bare form with no preview, no device dock, no Orbit branding
- Both pages now fully participate in the Orbit Premium design system

---

## TASK-20260610-002: Client-side session refactor + audio visualizer + mobile responsive

### START RECORD
- STATUS: COMPLETED
- Start time: 2026-06-10
- User requests:
  1. Refactor to client-side Gemini sessions (fix the audio routing bug)
  2. Add mic input audio visualizer
  3. Mobile responsive UI with native mobile look and feel

### WHAT CHANGED

#### 1. Architecture: Python Agent → Per-Client Gemini Sessions
The old architecture used a central Python agent that subscribed to all mic tracks and published per-(speaker, language) translation tracks, with complex frontend logic (`useTranslationRouting.ts`) to subscribe/unsubscribe. This caused the audio routing bug.

**New architecture:**
```
Browser A (lang=fr)  Browser B (lang=es)  Browser C (lang=de)
    │                      │                      │
    ├── Gemini Live (fr)   ├── Gemini Live (es)   ├── Gemini Live (de)
    │                      │                      │
    └── All remote audio   └── All remote audio   └── All remote audio
        → Gemini → fr out     → Gemini → es out     → Gemini → de out
```

**New files:**
| File | Purpose |
|------|---------|
| `src/lib/geminiLiveClient.ts` | Raw WebSocket client for Gemini Live API with `translationConfig` |
| `src/lib/audioPipeline.ts` | AudioContext-based mixer: captures remote mic → 16kHz PCM → Gemini; plays back 24kHz PCM |
| `src/lib/useGeminiTranslation.ts` | React hook: fetches API key, connects Gemini session, manages audio pipeline, returns captions |
| `src/app/api/gemini-key/route.ts` | Server endpoint returning `GEMINI_API_KEY` (never in client bundle) |

**Removed:**
| File | Reason |
|------|--------|
| `src/app/session/[id]/room/useTranslationRouting.ts` | Replaced by per-client Gemini sessions; no track routing needed |

**Modified:**
| File | What |
|------|------|
| `src/app/session/[id]/room/InCall.tsx` | Uses `useGeminiTranslation`; tracks mic stream for visualizer |
| `src/app/session/[id]/room/ChatSidebar.tsx` | Accepts `hookCaptions` prop for client-side captions alongside data channel |
| `src/app/api/token/route.ts` | Removed `RoomAgentDispatch` — no Python agent needed |
| `src/lib/config.ts` | Added `DICTIONARY_LANGS` |
| `package.json` | Simplified `dev` script; removed `concurrently` + agent runner |
| `.env.example` / `.env.local` | Added `GEMINI_API_KEY` |

#### 2. Mic Input Audio Visualizer

- **`src/lib/useAudioLevel.ts`** — Hook that computes RMS audio level (0–1) from a MediaStream using `AnalyserNode` at ~20fps
- **`src/app/session/[id]/room/AudioVisualizer.tsx`** — Animated VU-meter component with configurable bar count, size, and gradient
- **Prejoin page** (`/session/[id]/page.tsx`): Visualizer appears in the device dock, next to the mic button, animating when the mic is on
- **In-call page** (`/session/[id]/room/SelfView.tsx`): Visualizer overlay at the bottom-left of the self-view PIP

#### 3. Mobile Responsive UI

Comprehensive media queries in `globals.css`:

| Breakpoint | Changes |
|-----------|---------|
| **≤768px** (phone) | Prejoin: 2-column → stacked; Entry: smaller text; In-call: sidebars → full-screen overlays, control bar → compact bottom dock with safe-area, video grid → vertical scrolling (portrait), self-view → smaller bottom-right |
| **≤380px** (small phone) | Tighter spacing, 2-column grids collapse to 1-column |
| **769px–1024px** (tablet) | Balanced proportions, narrower sidebars, 3-column video grid |

### VALIDATION
- `npm run build` — compiled in ~1s, TypeScript passed, all 7 routes generated (including new `/api/gemini-key`)
- No TypeScript errors, no lint issues

### KEY DESIGN DECISIONS
- **Raw WebSocket** over `@google/genai` SDK: the Python agent's raw WS approach is battle-tested and gives full control over the protocol. The SDK's `sendClientContent` is turn-based, but we need real-time streaming (`realtimeInput`).
- **ScriptProcessorNode** over AudioWorklet: simpler setup, no separate worklet file needed, still universally supported.
- **Gemini output played at 24kHz** via AudioBufferSourceNode — the browser's audio stack handles resampling to the output device.
- **API key fetched at runtime** from `/api/gemini-key` — never compiled into the client bundle; allows server-side referrer checks later.
- **Medumba (byv)** routes to `useGeminiTranslation` returning `status: "dictionary"` — the hook skips Gemini and a future dictionary UI can plug in here.

### KNOWN ISSUES
- `echoTargetLanguage: false` — the user won't hear their own speech in the target language. Set to `true` for language-learning mode.
- Medumba dictionary panel not yet implemented in the UI (hook returns `status: "dictionary"` as the integration point).
- On Very Weak Connections: large rooms (5+ active speakers) may flood the Gemini WebSocket; backpressure handling can be added later.

### NEXT STEPS
1. End-to-end test: join a room with 2+ users, verify each hears the correct language
2. Implement Medumba dictionary display in the captions panel (populate from `status: "dictionary"`)
3. Add Gemini session health monitoring + auto-reconnect in `geminiLiveClient.ts`
