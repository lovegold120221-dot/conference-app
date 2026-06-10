# Translation System — Product Requirements & Spec

**Date:** 2026-06-10
**Status:** Approved & Implemented (v1)
**Model:** `gemini-3.5-live-translate-preview`

---

## 1. Product Requirements

### 1.1 Core Mission

Every participant hears the conference in **their own chosen language**. Translation must be real-time, audio-based (not text chat), and must **never echo a speaker's own speech back to them**.

### 1.2 Architecture Constraint — No Central Agent

Each browser connects **directly** to the Gemini Live API. There is **no server-side translation agent**. The LiveKit room is used only for:
- Peer audio/video publishing and subscription
- Data channel messages (chat, captions fallback)
- Participant attribute broadcast (language choice)

The Gemini API key is fetched at runtime from `/api/gemini-key` (server-only, not in client bundle).

### 1.3 Language Model

- **"I listen in" language:** The language the user wants to **hear**. This is NOT the language they speak. Each participant selects one target language.
- **Native passthrough:** If a user selects their native language (sentinel `NATIVE_LANG = "none"`), no Gemini session is created — they hear the original audio directly.
- **Dictionary fallback:** Low-resource languages (currently Medumba `byv`) return `status: "dictionary"`. The hook skips Gemini entirely; a future dictionary/ phrasebook UI can plug into `addExternalCaption`.

### 1.4 Room Capacity

Hard cap of **8 participants** per room. Enforced by both the token route and the client config (`MAX_PARTICIPANTS`).

### 1.5 Supported Audio Sources

All of the following remote audio sources are fed into a **single** Gemini session per user:

| Source | LiveKit Track.Source | Fed into Gemini? |
|---|---|---|
| Remote participant's microphone | `microphone` | ✅ Yes |
| Remote participant's screen share audio | `screen_share`, `screen_share_audio` | ✅ Yes |
| Remote participant's shared video audio | `unknown` (if audio-track) | ✅ Yes |
| Current user's own microphone | N/A — not a remote participant | ❌ Not in pipeline |

The current user's own mic audio is **never** in the pipeline because `useGeminiTranslation` only subscribes to `remoteParticipants` and their tracks. The user's own mic is a `localParticipant` — not iterated.

---

## 2. The "Do Not Translate My Own Mic Back To Me" Rule

This is enforced by **two independent mechanisms** that form a defence-in-depth:

### 2.1 Layer 1 — Gemini-Side: `echoTargetLanguage: false`

```json
{
  "translationConfig": {
    "targetLanguageCode": "fr",
    "echoTargetLanguage": false
  }
}
```

This tells the Gemini model: **do not translate the current speaker's voice back to them**. When User A speaks into their mic, their audio is published to the LiveKit room. Every other participant's Gemini session receives that audio (via the pipeline) and translates it. But User A's own Gemini session never receives User A's mic audio because:

### 2.2 Layer 2 — Pipeline-Side: Local mic is never in the pipeline

The `AudioPipeline` only contains `addRemoteTrack()` calls for **remote participants**. The local participant's mic is acquired via `navigator.mediaDevices.getUserMedia` and published to the room, but it is **never added** to the pipeline's mix. Therefore:

- User A's mic audio → published to LiveKit room → received by User B's browser → added to User B's pipeline → sent to User B's Gemini session → translated → User B hears it in their language ✅
- User A's mic audio → NOT in User A's pipeline → NOT sent to User A's Gemini session → User A never hears their own voice translated back ✅

### 2.3 Edge Case: What if a participant re-joins?

When a participant re-joins, they get a fresh `localParticipant` identity. Their own audio is still not in the pipeline (it's local, never remote). `echoTargetLanguage: false` remains in the Gemini setup. Both layers still hold.

### 2.4 Edge Case: What if two browser tabs from the same user join?

Each tab is a separate `localParticipant`. Tab A's mic is not in Tab A's pipeline (local). Tab A's mic IS in Tab B's pipeline (remote). Tab B's `echoTargetLanguage: false` would prevent the translation of Tab A's speech if Gemini considers Tab A the same speaker — but since each tab has a separate Gemini session and the identities differ, this is not a concern. Tab A hears their own voice from Tab B's mic via Tab B's session — this is an unavoidable side effect of multiple tabs and is considered out of scope.

---

## 3. User Flows

### 3.1 Flow A: Join conference and hear translations

```
1. User opens invite link → `/session/{roomId}`
2. Prejoin page loads:
   a. User enters display name
   b. User selects "I listen in" language (default: English)
   c. User optionally toggles camera/mic/speaker/background
   d. User clicks "Join the call"
3. User enters the room (InCall page):
   a. The hook `useGeminiTranslation(lang)` fires:
      - Fetches API key from `/api/gemini-key`
      - Creates `AudioPipeline` (AudioContext @ 16kHz)
      - Creates `GeminiLiveClient` with `translationConfig.targetLanguageCode = lang`
      - Connects WebSocket → sends `setup` with `echoTargetLanguage: false`
      - Starts ScriptProcessorNode (4096-frame buffer)
   b. Remote participants' audio tracks are subscribed:
      - `RoomEvent.TrackSubscribed` → `pipeline.addRemoteTrack(identity:source, stream)`
   c. Every 4096 frames, pipeline mixes remote audio → mono Int16 → `client.sendAudio(pcm)`
   d. Gemini returns translated 24kHz PCM → `pipeline.playTranslatedAudio(pcm, 24000)`
   e. Gemini returns text transcripts → appended to `captions` state array
   f. Captions sidebar renders captions with auto-scroll
4. User selects a different language:
   a. `targetLang` state changes → `useGeminiTranslation` cleanup runs
   b. Old Gemini session disconnected, old pipeline closed
   c. New session started with new `targetLanguageCode`
```

### 3.2 Flow B: Speaker mutes/unmutes translation audio

```
1. User sees speaker icon in ControlBar (between Captions and Participants buttons)
2. User clicks speaker icon:
   a. `toggleSpeaker()` flips `speakerOn` state
   b. Persisted to sessionStorage `lt.speaker`
   c. `useGeminiTranslation(lang, { playbackMuted: !speakerOn })` receives new value
   d. `mutedRef.current` updates immediately (ref, not state — no reconnect needed)
3. When playbackMuted = true:
   - `onAudio` callback skips `pipeline.playTranslatedAudio()`
   - Captions continue to appear (no data loss)
4. When playbackMuted = false:
   - Next Gemini audio frame triggers `pipeline.playTranslatedAudio()` again
   - No reconnect needed — Gemini session stays alive
```

### 3.3 Flow C: Screen share with audio

```
1. Remote participant starts screen share with system audio
2. LiveKit publishes screen share audio track (`Track.Source.ScreenShareAudio`)
3. `RoomEvent.TrackSubscribed` fires on all other clients
4. `handleSub` adds track to pipeline with composite ID `identity:screen_share_audio`
5. Screen share audio is mixed with mic audio → sent to Gemini → translated
6. Translation captions + audio are delivered alongside mic-based translations
7. When screen share stops → `TrackUnsubscribed` → track removed from pipeline
```

### 3.4 Flow D: Dictionary language (Medumba / byv)

```
1. User selects "Medumba (byv)" in prejoin
2. `useGeminiTranslation("byv")` fires
3. `DICTIONARY_LANGS.has("byv")` is true → returns `{ status: "dictionary", captions: [], addExternalCaption }`
4. No Gemini session, no audio pipeline created
5. The captions sidebar receives empty `txCaptions`
6. Future: `addExternalCaption` can be called by data-channel message or local phrasebook lookup
```

### 3.5 Flow E: Native language passthrough

```
1. User selects "None (no translation)" or their language matches NATIVE_LANG
2. `useGeminiTranslation("none")` fires
3. `targetLang === NATIVE_LANG` → returns `{ status: "idle", ... }`
4. No Gemini session, no pipeline
5. User hears the original LiveKit audio directly (LiveKit's default behaviour)
```

---

## 4. Translation Logic — Data Flow Architecture

### 4.1 Component Diagram

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Remote      │     │  AudioPipeline   │     │  GeminiLiveClient│
│  Participants│────▶│  (AudioContext)  │────▶│  (WebSocket)     │
│  (LiveKit)   │     │  16kHz mono PCM  │     │  BidiGenerate    │
└─────────────┘     └──────────────────┘     └──────────────────┘
                                                    │
                                                    ▼
                    ┌──────────────────┐     ┌──────────────────┐
                    │  playTranslated  │◀────│  Gemini Model    │
                    │  Audio() +       │     │  (translated     │
                    │  Captions[]      │     │  24kHz PCM + txt)│
                    └──────────────────┘     └──────────────────┘
```

### 4.2 Audio Pipeline Details

| Property | Value |
|---|---|
| Sample rate (capture) | 16 kHz (or browser default if unsupported) |
| Sample rate (output) | 24 kHz (Gemini native output) |
| Buffer size | 4096 frames |
| Channels in | 2 (stereo, mixed to mono) |
| Channels out | 1 (mono) |
| PCM format | Int16Array |
| Mixing | Sum all input channels → divide by channel count |

### 4.3 WebSocket Protocol

**Endpoint:**
```
wss://generativelanguage.googleapis.com/ws/
google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent
?key={GEMINI_API_KEY}
```

**Setup message (sent once on connect):**
```json
{
  "setup": {
    "model": "models/gemini-3.5-live-translate-preview",
    "outputAudioTranscription": {},
    "generationConfig": {
      "responseModalities": ["AUDIO"],
      "translationConfig": {
        "targetLanguageCode": "fr",
        "echoTargetLanguage": false
      }
    },
    "realtimeInputConfig": {
      "automaticActivityDetection": { "disabled": false }
    }
  }
}
```

**Audio input message (sent every ~256ms):**
```json
{
  "realtimeInput": {
    "audio": {
      "mimeType": "audio/pcm;rate=16000",
      "data": "<base64-encoded Int16 PCM>"
    }
  }
}
```

**Response (translated audio):**
```json
{
  "serverContent": {
    "modelTurn": {
      "parts": [
        {
          "inlineData": {
            "data": "<base64-encoded 24kHz PCM>"
          }
        }
      ]
    },
    "outputTranscription": {
      "text": "Bonjour, comment allez-vous?"
    }
  }
}
```

### 4.4 Lifecycle States

```
idle ──→ connecting ──→ connected ──→ disconnected
  │                       │
  └──→ dictionary         └──→ error
```

- **idle:** No translation needed (native lang or not yet initialized)
- **dictionary:** Language uses phrasebook (no Gemini session)
- **connecting:** WebSocket opening, waiting for `setupComplete`
- **connected:** Gemini session active, translating
- **disconnected:** Clean teardown
- **error:** WebSocket or API failure (timeout after 15s)

### 4.5 Translation Audio Toggle (playbackMuted)

The `playbackMuted` flag uses a **ref**, not state, to avoid re-creating the Gemini session:

```typescript
const mutedRef = useRef(playbackMuted);
mutedRef.current = playbackMuted;  // updated every render

// Inside onAudio:
onAudio: (pcm, sampleRate) => {
  if (!mutedRef.current) {
    pipeline.playTranslatedAudio(pcm, sampleRate);
  }
}
```

This means toggling mute is instant — no reconnect, no audio gap. The Gemini session continues to receive remote audio and return translations; only the final playback step is gated.

---

## 5. Acceptance Criteria

### 5.1 Echo Rule (CRITICAL — must pass all)

| # | Test | Expected | Pass condition |
|---|---|---|---|
| AC1 | User A speaks into mic. User A's Gemini session receives User A's audio. | User A's `echoTargetLanguage: false` tells Gemini not to translate back. Pipeline does NOT contain User A's mic. | User A does NOT hear their own voice translated. |
| AC2 | User A speaks into mic. User B's Gemini session receives User A's audio. | User A's audio is a remote track in User B's browser → pipeline → Gemini → translated. | User B hears User A's speech in User B's chosen language. |
| AC3 | User A speaks into mic. User B has screen share audio in pipeline. | Screen share audio is mixed with User A's mic audio in User B's pipeline. Both sent to Gemini. | User B hears translations of both User A's speech and the screen share audio. |
| AC4 | User A toggles speaker OFF during call. | `mutedRef.current = true`. Pipeline continues running. | User A still sees captions but hears no translated audio. |
| AC5 | User A toggles speaker ON after being OFF. | `mutedRef.current = false`. Gemini session still alive. | User A hears translated audio again immediately (no reconnect). |

### 5.2 Language Switching

| # | Test | Expected | Pass condition |
|---|---|---|---|
| AC6 | User changes "I listen in" from French to German. | Hook cleanup runs → old session/pipeline torn down → new session created with `targetLanguageCode: de`. | Translations arrive in German within ~3s. |
| AC7 | User selects native language "None". | `status: "idle"`, no session created. | User hears original LiveKit audio unchanged. |
| AC8 | User selects Medumba (byv). | `status: "dictionary"`, no session created. `addExternalCaption` available. | No Gemini connection attempted. |

### 5.3 Audio Pipeline

| # | Test | Expected | Pass condition |
|---|---|---|---|
| AC9 | 3 remote participants all speaking. | All 3 mic streams added to pipeline, mixed to mono 16kHz, sent to Gemini. | Single Gemini session handles all 3 voices. |
| AC10 | Remote participant starts screen share with audio. | `TrackSubscribed` fires → `addRemoteTrack` with composite ID `identity:screen_share`. | Screen share audio mixed into pipeline alongside mic. |
| AC11 | Remote participant stops screen share. | `TrackUnsubscribed` fires → `removeRemoteTrack` with same composite ID. | Only the screen share track removed; mic track remains. |
| AC12 | Remote participant leaves the room. | All their tracks unsubscribed → all their composite IDs removed from pipeline. | Pipeline only contains remaining participants' tracks. |

### 5.4 Connection Resilience

| # | Test | Expected | Pass condition |
|---|---|---|---|
| AC13 | Network drops during call. | WebSocket `onclose` fires → `status: "disconnected"`, `onError` called. | User sees disconnected state. |
| AC14 | Gemini API key is invalid or missing. | `fetch("/api/gemini-key")` returns 500 → init throws → `status: "error"`. | User sees error state. |
| AC15 | Gemini setup takes >15s. | Safety timeout rejects the promise → `status: "error"`. | User sees error state (not hanging forever). |

### 5.5 Captions

| # | Test | Expected | Pass condition |
|---|---|---|---|
| AC16 | Gemini returns `outputTranscription.text`. | `onTranscript` creates a `CaptionEntry` with `{ text, final, timestamp, id }` and appends to captions state. | Caption appears in sidebar. |
| AC17 | Captions SDK entry pushed via `addExternalCaption`. | Entry appended to same captions array. | External entry appears in sidebar alongside Gemini entries. |
| AC18 | Multiple rapid captions arrive. | Each appended to array; sidebar auto-scrolls. | No dropped captions, no duplicates. |

### 5.6 Security

| # | Test | Expected | Pass condition |
|---|---|---|---|
| AC19 | Client bundle is inspected. | No `GEMINI_API_KEY` string present in compiled JS. | Key only exists in `process.env` on server. |
| AC20 | `/api/gemini-key` is called without auth. | Returns the key (no auth layer — production should add referrer check). | Currently accepted; documented in route.ts. |

### 5.7 Dictionary (Medumba)

| # | Test | Expected | Pass condition |
|---|---|---|---|
| AC21 | User selects byv. | `useGeminiTranslation` returns `status: "dictionary"`. | No WebSocket created, no AudioContext created. |
| AC22 | `addExternalCaption` is called with a Medumba phrase. | Caption entry is appended to `txCaptions`. | In-call caption sidebar renders it. |

---

## 6. Non-Goals (Explicitly Out of Scope)

- **Two separate Gemini sessions per user** (one for mic, one for screen share). Currently one session handles all mixed audio. If audio-source-based mute is needed, this would require dual sessions.
- **Server-side translation agent.** The Python agent was removed. All translation is client-side.
- **Speaker identification in captions.** Captions don't label who is speaking (Gemini doesn't return speaker diarization).
- **Recording translations.** The recording feature captures raw room audio, not translated audio.
- **Language learning mode.** `echoTargetLanguage: true` is available (for learning) but not exposed in the UI.
- **Reconnection with state recovery.** If the Gemini WebSocket drops, captions are lost. No replay/recovery mechanism.

---

## 7. Reference — Key Files

| File | Role |
|---|---|
| `src/lib/geminiLiveClient.ts` | Raw WebSocket client for Gemini Live API |
| `src/lib/audioPipeline.ts` | AudioContext mixer + PCM conversion + playback |
| `src/lib/useGeminiTranslation.ts` | React hook tying pipeline + client + captions |
| `src/lib/useAudioLevel.ts` | Mic RMS level via AnalyserNode |
| `src/lib/config.ts` | `NATIVE_LANG`, `DICTIONARY_LANGS`, `MAX_PARTICIPANTS` |
| `src/app/api/gemini-key/route.ts` | Server endpoint returning `GEMINI_API_KEY` |
| `src/app/session/[id]/page.tsx` | Prejoin page (language, name, speaker toggle) |
| `src/app/session/[id]/room/InCall.tsx` | In-call page, wires hook to UI |
| `src/app/session/[id]/room/ControlBar.tsx` | Bottom dock with speaker toggle button |
| `src/app/session/[id]/room/AudioVisualizer.tsx` | VU meter component |
| `src/app/session/[id]/room/ChatSidebar.tsx` | Captions panel |
