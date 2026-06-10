/**
 * Browser-side audio pipeline for the client-side translation architecture.
 *
 * Responsibilities:
 *  1. Mix remote participants' mic audio into a single 16 kHz mono PCM stream
 *  2. Call a user-provided callback with each PCM chunk (→ GeminiLiveClient.sendAudio)
 *  3. Play back translated PCM audio received from Gemini (via playTranslatedAudio)
 *
 * Uses Web Audio API (ScriptProcessorNode) so no server‑side or Node.js deps needed.
 */

// ── Pipeline ─────────────────────────────────────────────────────────

export type PcmCallback = (pcm: Int16Array) => void;

export class AudioPipeline {
  private ctx: AudioContext | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private sourceNodes: Array<{
    streamId: string;
    source: MediaStreamAudioSourceNode;
  }> = [];
  private onPcm: PcmCallback | null = null;
  private _inputSampleRate = 0;

  /** The sample rate we capture audio at (should be 16000 for Gemini). */
  get inputSampleRate(): number {
    return this._inputSampleRate;
  }

  /**
   * Initialise the AudioContext and ScriptProcessorNode.
   *
   * @param onPcm  Called with 16 kHz mono Int16Array chunks (4096 frames).
   */
  async start(onPcm: PcmCallback): Promise<void> {
    // Try 16 kHz context so Web Audio resamples everything for us.
    // Fall back to default if the browser doesn't support the requested rate.
    try {
      this.ctx = new AudioContext({ sampleRate: 16_000 });
    } catch {
      this.ctx = new AudioContext();
    }
    this._inputSampleRate = this.ctx.sampleRate;
    this.onPcm = onPcm;

    // ScriptProcessorNode: 4096-frame buffer, sum all input channels → mono.
    this.scriptNode = this.ctx.createScriptProcessor(4096, 2, 1);
    this.scriptNode.onaudioprocess = (event: AudioProcessingEvent) => {
      const input = event.inputBuffer;
      const numChannels = input.numberOfChannels;
      const length = input.length;

      // Mix all channels down to mono
      if (numChannels === 0) return;
      const mono = new Float32Array(length);
      for (let c = 0; c < numChannels; c++) {
        const ch = input.getChannelData(c);
        for (let i = 0; i < length; i++) {
          mono[i] += ch[i] / numChannels;
        }
      }

      const pcm = float32ToInt16(mono);
      this.onPcm?.(pcm);
    };

    // Connect to destination to keep the audio graph alive
    this.scriptNode.connect(this.ctx.destination);
  }

  /**
   * Add a remote participant's mic MediaStream to the mix.
   * Duplicate streamIds are silently ignored.
   */
  addRemoteTrack(streamId: string, stream: MediaStream): void {
    if (!this.ctx || this.sourceNodes.some((n) => n.streamId === streamId))
      return;
    try {
      const source = this.ctx.createMediaStreamSource(stream);
      source.connect(this.scriptNode!);
      this.sourceNodes.push({ streamId, source });
    } catch {
      // stream may have ended
    }
  }

  /** Remove a remote track from the mix. */
  removeRemoteTrack(streamId: string): void {
    const idx = this.sourceNodes.findIndex((n) => n.streamId === streamId);
    if (idx === -1) return;
    this.sourceNodes[idx].source.disconnect();
    this.sourceNodes.splice(idx, 1);
  }

  /**
   * Play back a chunk of translated PCM audio (from Gemini).
   * Sample rate is typically 24 000 for Gemini output.
   */
  playTranslatedAudio(pcm: Int16Array, sampleRate: number): void {
    if (!this.ctx) return;

    const buf = this.ctx.createBuffer(1, pcm.length, sampleRate);
    const channel = buf.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) {
      channel[i] = pcm[i] / 32768;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buf;
    source.connect(this.ctx.destination);
    source.start();
  }

  /** Tear down the entire pipeline. Idempotent. */
  close(): void {
    for (const entry of this.sourceNodes) {
      entry.source.disconnect();
    }
    this.sourceNodes = [];
    this.scriptNode?.disconnect();
    this.scriptNode = null;
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.onPcm = null;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 32768 : s * 32767;
  }
  return int16;
}
