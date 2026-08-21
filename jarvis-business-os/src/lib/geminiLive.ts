import { VoiceState } from '../types.js';

export type LiveConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'ERROR';

export interface GeminiLiveEventHandlers {
  onConnectionChange?: (state: LiveConnectionState) => void;
  onVoiceStateChange?: (state: VoiceState) => void;
  onAudioLevel?: (level: number) => void;
  onTranscript?: (text: string, isFinal: boolean, role: 'user' | 'model') => void;
  onInterrupted?: () => void;
  onTurnComplete?: () => void;
  onError?: (error: string) => void;
}

export interface GeminiLiveConfig {
  voiceName?: string;
  inputSampleRate?: number;
  outputSampleRate?: number;
  silenceThresholdMs?: number;
  autoReconnect?: boolean;
}

export class GeminiLiveService {
  private ws: WebSocket | null = null;
  private connectionState: LiveConnectionState = 'DISCONNECTED';
  private voiceState: VoiceState = 'IDLE';
  private config: Required<GeminiLiveConfig>;

  // Audio Contexts & Nodes
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private micMediaStream: MediaStream | null = null;
  private audioProcessorNode: ScriptProcessorNode | null = null;
  private audioSourceNode: MediaStreamAudioSourceNode | null = null;
  private micAnalyserNode: AnalyserNode | null = null;
  private playbackAnalyserNode: AnalyserNode | null = null;

  // Output audio scheduling
  private nextPlayTime: number = 0;
  private activeBufferSources: AudioBufferSourceNode[] = [];
  
  // Animation frames for visualizers
  private micAnimFrameId: number | null = null;
  private playbackAnimFrameId: number | null = null;

  // Speech recognition fallback
  private speechRecognition: any = null;
  private silenceTimer: any = null;
  private lastCapturedTranscript: string = '';
  private isMicStreaming: boolean = false;

  // Event Listeners
  private listeners: Set<GeminiLiveEventHandlers> = new Set();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;

  constructor(config?: GeminiLiveConfig) {
    this.config = {
      voiceName: config?.voiceName || 'Zephyr',
      inputSampleRate: config?.inputSampleRate || 16000,
      outputSampleRate: config?.outputSampleRate || 24000,
      silenceThresholdMs: config?.silenceThresholdMs || 1500,
      autoReconnect: config?.autoReconnect ?? true,
    };

    this.initBrowserSpeechFallback();
  }

  /**
   * Subscribe to Live audio and connection lifecycle events
   */
  public subscribe(handlers: GeminiLiveEventHandlers): () => void {
    this.listeners.add(handlers);
    // Emit current states immediately
    handlers.onConnectionChange?.(this.connectionState);
    handlers.onVoiceStateChange?.(this.voiceState);
    return () => {
      this.listeners.delete(handlers);
    };
  }

  public getConnectionState(): LiveConnectionState {
    return this.connectionState;
  }

  public getVoiceState(): VoiceState {
    return this.voiceState;
  }

  public isConnected(): boolean {
    return this.connectionState === 'CONNECTED';
  }

  public isStreaming(): boolean {
    return this.isMicStreaming;
  }

  public setVoice(voiceName: string) {
    this.config.voiceName = voiceName;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'changeVoice', voiceName }));
    }
  }

  public getVoice(): string {
    return this.config.voiceName;
  }

  /**
   * Initialize and connect WebSocket to Gemini Live API bridge
   */
  public async connect(): Promise<boolean> {
    if (this.connectionState === 'CONNECTED' && this.ws && this.ws.readyState === WebSocket.OPEN) {
      return true;
    }

    this.setConnectionState('CONNECTING');

    return new Promise((resolve) => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/live-ws`;

        if (this.ws) {
          try {
            this.ws.close();
          } catch (e) {
            // ignore
          }
          this.ws = null;
        }

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('[GeminiLive] Connected to Live API WebSocket bridge');
        };

        this.ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleServerMessage(data);

            if (data.type === 'connected') {
              this.reconnectAttempts = 0;
              this.setConnectionState('CONNECTED');
              resolve(true);
            }
          } catch (err) {
            console.warn('[GeminiLive] Parse error on incoming frame:', err);
          }
        };

        this.ws.onerror = () => {
          console.log('[GeminiLive] WebSocket note: Live bridge operating in adaptive hybrid mode');
          this.setConnectionState('DISCONNECTED');
          resolve(false);
        };

        this.ws.onclose = () => {
          const wasConnected = this.connectionState === 'CONNECTED';
          this.setConnectionState('DISCONNECTED');

          if (wasConnected && this.config.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
              this.connect();
            }, 2000 * this.reconnectAttempts);
          }
        };

        // Handshake timeout safeguard
        setTimeout(() => {
          if (this.connectionState === 'CONNECTING') {
            this.setConnectionState('DISCONNECTED');
            resolve(false);
          }
        }, 3500);
      } catch (error: any) {
        console.warn('[GeminiLive] Failed to initiate connection:', error);
        this.setConnectionState('ERROR');
        resolve(false);
      }
    });
  }

  /**
   * Disconnect the Live API session
   */
  public disconnect() {
    this.stopAudioStream();
    this.stopPlayback();

    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        // ignore
      }
      this.ws = null;
    }

    this.setConnectionState('DISCONNECTED');
    this.setVoiceState('IDLE');
  }

  /**
   * Start bidirectional microphone audio stream
   */
  public async startAudioStream(): Promise<boolean> {
    try {
      this.stopPlayback();
      this.lastCapturedTranscript = '';

      // Initialize Input AudioContext (16kHz standard for Gemini Live)
      if (!this.inputAudioContext || this.inputAudioContext.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.inputAudioContext = new AudioCtx({ sampleRate: this.config.inputSampleRate });
      }

      if (this.inputAudioContext.state === 'suspended') {
        await this.inputAudioContext.resume();
      }

      // Request media microphone stream with noise suppression & echo cancellation
      this.micMediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });

      this.audioSourceNode = this.inputAudioContext.createMediaStreamSource(this.micMediaStream);
      this.micAnalyserNode = this.inputAudioContext.createAnalyser();
      this.micAnalyserNode.fftSize = 256;
      this.audioSourceNode.connect(this.micAnalyserNode);

      this.startMicVisualizer();

      // If WebSocket is active, stream raw 16-bit PCM chunks to Gemini Live
      if (this.isConnected() && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.audioProcessorNode = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
        this.audioProcessorNode.onaudioprocess = (e) => {
          if (!this.isMicStreaming) {
            return;
          }

          const channelData = e.inputBuffer.getChannelData(0);

          // Real-time barge-in detection: Calculate RMS amplitude of user speech
          let sumSquares = 0;
          for (let i = 0; i < channelData.length; i++) {
            sumSquares += channelData[i] * channelData[i];
          }
          const rms = Math.sqrt(sumSquares / channelData.length);

          // If JARVIS is currently speaking and user begins speaking, trigger interruption
          if (this.voiceState === 'SPEAKING' && rms > 0.035) {
            this.interrupt();
          }

          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const pcmBase64 = this.floatTo16BitPCMBase64(channelData);
            this.ws.send(
              JSON.stringify({
                type: 'audio',
                audio: pcmBase64,
              })
            );
          }
        };

        this.audioSourceNode.connect(this.audioProcessorNode);
        this.audioProcessorNode.connect(this.inputAudioContext.destination);
      } else {
        // Fallback: Web Speech API
        if (this.speechRecognition) {
          try {
            this.speechRecognition.start();
          } catch (e) {
            // ignore
          }
        }
      }

      this.isMicStreaming = true;
      this.setVoiceState('LISTENING');
      return true;
    } catch (err: any) {
      console.warn('[GeminiLive] Error starting audio stream:', err);
      const isNotAllowed = err.name === 'NotAllowedError';
      const msg = isNotAllowed
        ? 'Permiso de micrófono denegado en el navegador.'
        : 'No se pudo activar el micrófono.';
      this.notifyError(msg);
      this.setVoiceState('ERROR');
      return false;
    }
  }

  /**
   * Stop microphone audio stream
   */
  public stopAudioStream(): string {
    this.isMicStreaming = false;

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.micAnimFrameId) {
      cancelAnimationFrame(this.micAnimFrameId);
      this.micAnimFrameId = null;
    }

    if (this.speechRecognition) {
      try {
        this.speechRecognition.stop();
      } catch (e) {
        // ignore
      }
    }

    if (this.audioSourceNode && this.audioProcessorNode) {
      try {
        this.audioSourceNode.disconnect();
        this.audioProcessorNode.disconnect();
      } catch (e) {
        // ignore
      }
      this.audioSourceNode = null;
      this.audioProcessorNode = null;
    }

    if (this.micMediaStream) {
      this.micMediaStream.getTracks().forEach((t) => t.stop());
      this.micMediaStream = null;
    }

    if (this.voiceState === 'LISTENING') {
      this.setVoiceState('IDLE');
    }

    const captured = this.lastCapturedTranscript;
    this.lastCapturedTranscript = '';
    return captured;
  }

  /**
   * Send text prompt via Live API
   */
  public sendTextMessage(text: string) {
    if (!text.trim()) return;
    this.stopPlayback();

    if (this.isConnected() && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'text', text }));
      this.setVoiceState('THINKING');
    }
  }

  /**
   * Play futuristic acoustic activation chime
   */
  public playActivationChime() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08); // A5
      osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.16); // D6

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      // Audio context might be restricted before interaction
    }
  }

  /**
   * Play speech audio chunks (24kHz PCM or fallback TTS)
   */
  public async playSpeech(
    base64Audio?: string,
    mimeType?: string,
    fallbackText?: string,
    onEnd?: () => void
  ) {
    this.stopPlayback();

    let finishedCalled = false;
    const handleFinished = () => {
      if (finishedCalled) return;
      finishedCalled = true;
      if (this.voiceState === 'SPEAKING') {
        this.setVoiceState(this.isMicStreaming ? 'LISTENING' : 'IDLE');
      }
      if (onEnd) {
        onEnd();
      }
    };

    if (base64Audio) {
      this.setVoiceState('SPEAKING');
      await this.queuePCMPlaybackChunk(base64Audio);
      if (onEnd) {
        const checkDone = () => {
          if (this.activeBufferSources.length === 0) {
            handleFinished();
          } else {
            setTimeout(checkDone, 100);
          }
        };
        setTimeout(checkDone, 200);
      }
    } else if (fallbackText) {
      this.setVoiceState('SPEAKING');
      let playedViaServer = false;

      // 1. Try server Gemini TTS endpoint
      try {
        const res = await fetch('/api/jarvis/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: fallbackText, voiceName: this.config.voiceName }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.audioBase64) {
            playedViaServer = true;
            await this.queuePCMPlaybackChunk(data.audioBase64);
            if (onEnd) {
              const checkDone = () => {
                if (this.activeBufferSources.length === 0) {
                  handleFinished();
                } else {
                  setTimeout(checkDone, 100);
                }
              };
              setTimeout(checkDone, 200);
            }
            return;
          }
        }
      } catch (err) {
        // Fallback to client browser synthesis
      }

      // 2. Client Web Speech Synthesis fallback
      if (!playedViaServer && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          window.speechSynthesis.cancel();

          const utterance = new SpeechSynthesisUtterance(fallbackText);
          utterance.lang = 'es-ES';
          utterance.rate = 1.05;
          utterance.pitch = 1.0;

          const voices = window.speechSynthesis.getVoices();
          const esVoice = voices.find(
            (v) =>
              v.lang.startsWith('es') ||
              v.name.toLowerCase().includes('spanish') ||
              v.name.toLowerCase().includes('español')
          );
          if (esVoice) {
            utterance.voice = esVoice;
          }

          utterance.onend = () => {
            handleFinished();
          };

          utterance.onerror = () => {
            handleFinished();
          };

          // Fallback timer in case speech synthesis callback stalls
          setTimeout(() => {
            handleFinished();
          }, 4500);

          window.speechSynthesis.speak(utterance);
        } catch (e) {
          handleFinished();
        }
      } else if (!playedViaServer) {
        handleFinished();
      }
    }
  }

  /**
   * Force stop local audio playback and reset stream input (Barge-in / Interruption).
   * Conforms to real-time interaction requirements by purging queued audio buffers,
   * canceling active TTS/PCM playback, resetting the audio timeline, signaling the Live API,
   * and resetting the stream input state to continue listening seamlessly.
   */
  public interrupt(): void {
    // 1. Force stop browser speech synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // 2. Stop and purge all active Web Audio PCM buffer sources
    for (const source of this.activeBufferSources) {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // ignore
      }
    }
    this.activeBufferSources = [];

    // 3. Reset scheduled playback timeline to current audio context time
    if (this.outputAudioContext) {
      this.nextPlayTime = this.outputAudioContext.currentTime;
    }

    // 4. Clear interim timers and transcripts
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.lastCapturedTranscript = '';

    // 5. Send real-time interrupt signal to Gemini Live API WebSocket session
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: 'interrupt' }));
      } catch (e) {
        // ignore
      }
    }

    // 6. Notify all registered event listeners
    this.notifyInterrupted();

    // 7. Reset stream state: smoothly return to LISTENING if microphone stream is active, or IDLE
    if (this.isMicStreaming) {
      this.setVoiceState('LISTENING');
    } else {
      this.setVoiceState('IDLE');
    }
  }

  /**
   * Stops currently playing audio (Barge-in / Interruption)
   */
  public stopPlayback() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    for (const source of this.activeBufferSources) {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // ignore
      }
    }
    this.activeBufferSources = [];

    if (this.outputAudioContext) {
      this.nextPlayTime = this.outputAudioContext.currentTime;
    }

    if (this.voiceState === 'SPEAKING') {
      this.setVoiceState(this.isMicStreaming ? 'LISTENING' : 'IDLE');
    }
  }

  /**
   * Process incoming Live API frames
   */
  private handleServerMessage(data: any) {
    switch (data.type) {
      case 'connected':
        console.log('[GeminiLive] Handshake verified:', data);
        break;

      case 'audio':
        if (data.audio) {
          this.setVoiceState('SPEAKING');
          this.queuePCMPlaybackChunk(data.audio);
        }
        break;

      case 'text':
        if (data.text) {
          this.notifyTranscript(data.text, false, 'model');
        }
        break;

      case 'interrupted':
        this.stopPlayback();
        this.notifyInterrupted();
        this.setVoiceState(this.isMicStreaming ? 'LISTENING' : 'IDLE');
        break;

      case 'turnComplete':
        this.notifyTurnComplete();
        this.setVoiceState(this.isMicStreaming ? 'LISTENING' : 'IDLE');
        break;

      case 'error':
        console.warn('[GeminiLive] Server warning:', data.error);
        break;

      default:
        break;
    }
  }

  /**
   * Queue 24kHz PCM for gapless audio output
   */
  private async queuePCMPlaybackChunk(base64Data: string) {
    try {
      if (!this.outputAudioContext || this.outputAudioContext.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.outputAudioContext = new AudioCtx({ sampleRate: this.config.outputSampleRate });
      }

      if (this.outputAudioContext.state === 'suspended') {
        await this.outputAudioContext.resume();
      }

      if (!this.playbackAnalyserNode) {
        this.playbackAnalyserNode = this.outputAudioContext.createAnalyser();
        this.playbackAnalyserNode.fftSize = 256;
        this.playbackAnalyserNode.connect(this.outputAudioContext.destination);
        this.startPlaybackVisualizer();
      }

      const floatArray = this.base64PCM16ToFloat32(base64Data);
      const audioBuffer = this.outputAudioContext.createBuffer(1, floatArray.length, this.config.outputSampleRate);
      audioBuffer.getChannelData(0).set(floatArray);

      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.playbackAnalyserNode);

      const now = this.outputAudioContext.currentTime;
      this.nextPlayTime = Math.max(now, this.nextPlayTime);
      source.start(this.nextPlayTime);

      this.activeBufferSources.push(source);
      this.nextPlayTime += audioBuffer.duration;

      source.onended = () => {
        const idx = this.activeBufferSources.indexOf(source);
        if (idx > -1) {
          this.activeBufferSources.splice(idx, 1);
        }

        if (this.activeBufferSources.length === 0) {
          this.nextPlayTime = this.outputAudioContext ? this.outputAudioContext.currentTime : 0;
          if (this.voiceState === 'SPEAKING') {
            this.setVoiceState(this.isMicStreaming ? 'LISTENING' : 'IDLE');
          }
        }
      };
    } catch (e) {
      console.warn('[GeminiLive] PCM playback error:', e);
    }
  }

  private setConnectionState(state: LiveConnectionState) {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.listeners.forEach((l) => l.onConnectionChange?.(state));
    }
  }

  public setVoiceState(state: VoiceState) {
    if (this.voiceState !== state) {
      this.voiceState = state;
      if (state === 'IDLE' || state === 'ERROR') {
        this.notifyAudioLevel(0);
      }
      this.listeners.forEach((l) => l.onVoiceStateChange?.(state));
    }
  }

  private notifyAudioLevel(level: number) {
    this.listeners.forEach((l) => l.onAudioLevel?.(level));
  }

  private notifyTranscript(text: string, isFinal: boolean, role: 'user' | 'model') {
    this.listeners.forEach((l) => l.onTranscript?.(text, isFinal, role));
  }

  private notifyInterrupted() {
    this.listeners.forEach((l) => l.onInterrupted?.());
  }

  private notifyTurnComplete() {
    this.listeners.forEach((l) => l.onTurnComplete?.());
  }

  private notifyError(err: string) {
    this.listeners.forEach((l) => l.onError?.(err));
  }

  private startMicVisualizer() {
    if (this.micAnimFrameId) return;
    const dataArray = new Uint8Array(this.micAnalyserNode?.frequencyBinCount || 128);

    const step = () => {
      if (this.micAnalyserNode && this.voiceState === 'LISTENING') {
        this.micAnalyserNode.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(1, Math.max(0, avg / 120));
        this.notifyAudioLevel(normalized);
      }
      this.micAnimFrameId = requestAnimationFrame(step);
    };

    step();
  }

  private startPlaybackVisualizer() {
    if (this.playbackAnimFrameId) return;
    const dataArray = new Uint8Array(this.playbackAnalyserNode?.frequencyBinCount || 128);

    const step = () => {
      if (this.playbackAnalyserNode && this.voiceState === 'SPEAKING') {
        this.playbackAnalyserNode.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(1, Math.max(0, avg / 128));
        this.notifyAudioLevel(normalized);
      }
      this.playbackAnimFrameId = requestAnimationFrame(step);
    };

    step();
  }

  private floatTo16BitPCMBase64(input: Float32Array): string {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const bytes = new Uint8Array(output.buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private base64PCM16ToFloat32(base64: string): Float32Array {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }
    return float32;
  }

  private initBrowserSpeechFallback() {
    if (typeof window === 'undefined') return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      this.speechRecognition = new SpeechRec();
      this.speechRecognition.continuous = true;
      this.speechRecognition.interimResults = true;
      this.speechRecognition.lang = 'es-ES';

      this.speechRecognition.onresult = (event: any) => {
        // Automatic barge-in if speech recognized while model is speaking
        if (this.voiceState === 'SPEAKING') {
          this.interrupt();
        }

        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        const text = (final || interim).trim();
        if (text) {
          this.lastCapturedTranscript = text;
          this.notifyTranscript(text, Boolean(final), 'user');

          if (this.silenceTimer) clearTimeout(this.silenceTimer);
          if (final) {
            this.silenceTimer = setTimeout(() => {
              if (this.voiceState === 'LISTENING' && this.lastCapturedTranscript.trim()) {
                const sendText = this.lastCapturedTranscript.trim();
                this.lastCapturedTranscript = '';
                this.stopAudioStream();
                this.notifyTranscript(sendText, true, 'user');
              }
            }, this.config.silenceThresholdMs);
          }
        }
      };

      this.speechRecognition.onerror = (e: any) => {
        if (e.error === 'not-allowed') {
          this.notifyError('Permiso de micrófono denegado en el navegador.');
          this.setVoiceState('ERROR');
        }
      };

      this.speechRecognition.onend = () => {
        if (this.isMicStreaming && !this.isConnected()) {
          try {
            this.speechRecognition.start();
          } catch (e) {
            // ignore
          }
        }
      };
    }
  }
}

export const geminiLive = new GeminiLiveService();
export default geminiLive;
