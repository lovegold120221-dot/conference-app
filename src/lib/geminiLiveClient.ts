/**
 * Gemini Live API WebSocket client for real-time audio translation.
 *
 * Each client connects to a dedicated Gemini session configured with
 * `translationConfig.targetLanguageCode`. Audio sent to the session is
 * translated in real-time and returned as PCM audio + text transcripts.
 *
 * This runs in the browser — each user gets their own session so there
 * is zero track-routing complexity on the LiveKit side.
 */

const GEMINI_WS_URL =
  "wss://generativelanguage.googleapis.com/ws/" +
  "google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

// ── Types ────────────────────────────────────────────────────────────

export type GeminiStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface GeminiLiveCallbacks {
  /** Called when translated audio arrives from Gemini (24 kHz PCM). */
  onAudio: (pcm: Int16Array, sampleRate: number) => void;
  /** Called when a text transcript chunk arrives from Gemini. */
  onTranscript: (text: string, final: boolean) => void;
  /** Called when the connection status changes. */
  onStatusChange: (status: GeminiStatus) => void;
  /** Called on WebSocket errors or unexpected disconnects. */
  onError: (error: Error) => void;
}

// ── Client ───────────────────────────────────────────────────────────

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private targetLang = "";
  private setupComplete = false;
  private closed = false;
  private callbacks: GeminiLiveCallbacks;

  constructor(callbacks: GeminiLiveCallbacks) {
    this.callbacks = callbacks;
  }

  /** True when the WebSocket is open AND the Gemini setup handshake is done. */
  get connected(): boolean {
    return (
      this.setupComplete &&
      this.ws !== null &&
      this.ws.readyState === WebSocket.OPEN
    );
  }

  /**
   * Open a Gemini Live session configured for the given target language.
   * Resolves once the `setupComplete` handshake is received.
   */
  connect(apiKey: string, targetLang: string): Promise<void> {
    this.targetLang = targetLang;
    this.closed = false;
    this.setupComplete = false;
    this.callbacks.onStatusChange("connecting");

    const url = `${GEMINI_WS_URL}?key=${apiKey}`;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);
      } catch (err) {
        this.callbacks.onStatusChange("error");
        reject(err);
        return;
      }

      this.ws.onopen = () => {
        this.sendSetup();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data as string);
          if (msg.setupComplete) {
            this.setupComplete = true;
            this.callbacks.onStatusChange("connected");
            resolve();
            return;
          }
          this.handleMessage(msg);
        } catch {
          // skip malformed frames
        }
      };

      this.ws.onerror = () => {
        this.callbacks.onError(new Error("Gemini WebSocket error"));
        if (!this.setupComplete) {
          this.callbacks.onStatusChange("error");
          reject(new Error("Gemini WebSocket error"));
        }
      };

      this.ws.onclose = (event: CloseEvent) => {
        if (!this.closed) {
          this.callbacks.onStatusChange("disconnected");
          this.callbacks.onError(
            new Error(`Gemini closed: ${event.reason || "unknown"}`),
          );
        }
        if (!this.setupComplete) {
          reject(
            new Error(`Gemini closed before setup: ${event.reason ?? "unknown"}`),
          );
        }
      };

      // Safety timeout — if Gemini hasn't acknowledged setup in 15s, bail.
      setTimeout(() => {
        if (!this.setupComplete) {
          reject(new Error("Gemini setup timeout (15s)"));
        }
      }, 15_000);
    });
  }

  /** Send a chunk of 16 kHz mono PCM audio to be translated. */
  sendAudio(pcm: Int16Array): void {
    if (!this.connected) return;

    const b64 = int16ToBase64(pcm);
    const msg = {
      realtimeInput: {
        audio: {
          mimeType: "audio/pcm;rate=16000",
          data: b64,
        },
      },
    };

    try {
      this.ws!.send(JSON.stringify(msg));
    } catch {
      // connection likely gone — next onclose will fire
    }
  }

  /** Close the session. Idempotent. */
  disconnect(): void {
    if (this.closed) return;
    this.closed = true;
    this.setupComplete = false;
    this.ws?.close();
    this.ws = null;
    this.callbacks.onStatusChange("disconnected");
  }

  // ── Internal ─────────────────────────────────────────────────────

  private sendSetup(): void {
    const payload = {
      setup: {
        model: "models/gemini-3.5-live-translate-preview",
        outputAudioTranscription: {},
        generationConfig: {
          responseModalities: ["AUDIO"],
          translationConfig: {
            targetLanguageCode: this.targetLang,
            echoTargetLanguage: false,
          },
        },
        realtimeInputConfig: {
          automaticActivityDetection: { disabled: false },
        },
      },
    };
    this.ws!.send(JSON.stringify(payload));
  }

  private handleMessage(msg: Record<string, unknown>): void {
    const sc = msg.serverContent as Record<string, unknown> | undefined;
    if (!sc) return;

    // ── Translated audio frames ──
    const modelTurn = sc.modelTurn as Record<string, unknown> | undefined;
    if (modelTurn?.parts) {
      const parts = modelTurn.parts as Array<Record<string, unknown>>;
      for (const part of parts) {
        const inline = part.inlineData as Record<string, unknown> | undefined;
        if (inline?.data && typeof inline.data === "string") {
          try {
            const pcm = base64ToInt16(inline.data);
            // Gemini outputs 24 kHz PCM
            this.callbacks.onAudio(pcm, 24_000);
          } catch {
            // skip corrupt frame
          }
        }
      }
    }

    // ── Text transcript ──
    const ot = sc.outputTranscription as Record<string, unknown> | undefined;
    if (ot?.text && typeof ot.text === "string") {
      this.callbacks.onTranscript(ot.text, !sc.turnComplete);
    }
  }
}

// ── PCM helpers ──────────────────────────────────────────────────────

function base64ToInt16(b64: string): Int16Array {
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) {
    view[i] = raw.charCodeAt(i);
  }
  return new Int16Array(buf);
}

function int16ToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
