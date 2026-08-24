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
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private micMediaStream: MediaStream | null = null;
  private audioProcessorNode: ScriptProcessorNode | null = null;
  private audioSourceNode: MediaStreamAudioSourceNode | null = null;
  private micAnalyserNode: AnalyserNode | null = null;
  private playbackAnalyserNode: AnalyserNode | null = null;
  private nextPlayTime = 0;
  private activeBufferSources: AudioBufferSourceNode[] = [];
  private micAnimFrameId: number | null = null;
  private playbackAnimFrameId: number | null = null;
  private speechRecognition: any = null;
  private silenceTimer: any = null;
  private lastCapturedTranscript = '';
  private isMicStreaming = false;
  private listeners: Set<GeminiLiveEventHandlers> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

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

  public subscribe(handlers: GeminiLiveEventHandlers): () => void {
    this.listeners.add(handlers);
    handlers.onConnectionChange?.(this.connectionState);
    handlers.onVoiceStateChange?.(this.voiceState);
    return () => this.listeners.delete(handlers);
  }

  public getConnectionState(): LiveConnectionState { return this.connectionState; }
  public getVoiceState(): VoiceState { return this.voiceState; }
  public isConnected(): boolean { return this.connectionState === 'CONNECTED'; }
  public isStreaming(): boolean { return this.isMicStreaming; }

  public setVoice(voiceName: string) {
    this.config.voiceName = voiceName;
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'changeVoice', voiceName }));
    }
  }

  public getVoice(): string { return this.config.voiceName; }

  public async connect(): Promise<boolean> {
    if (this.isConnected() && this.ws?.readyState === WebSocket.OPEN) return true;
    this.setConnectionState('CONNECTING');

    return new Promise((resolve) => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/live-ws`;
        this.ws?.close();
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => console.log('[GeminiLive] Live bridge connected');
        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleServerMessage(data);
            if (data.type === 'connected') {
              this.reconnectAttempts = 0;
              this.setConnectionState('CONNECTED');
              resolve(true);
            }
          } catch (err) {
            console.warn('[GeminiLive] Invalid server frame', err);
          }
        };
        this.ws.onerror = () => {
          this.setConnectionState('DISCONNECTED');
          resolve(false);
        };
        this.ws.onclose = () => {
          const wasConnected = this.connectionState === 'CONNECTED';
          this.setConnectionState('DISCONNECTED');
          if (wasConnected && this.config.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => void this.connect(), 2000 * this.reconnectAttempts);
          }
        };
        setTimeout(() => {
          if (this.connectionState === 'CONNECTING') {
            this.setConnectionState('DISCONNECTED');
            resolve(false);
          }
        }, 3500);
      } catch (err) {
        console.warn('[GeminiLive] Connection failed', err);
        this.setConnectionState('ERROR');
        resolve(false);
      }
    });
  }

  public disconnect() {
    this.stopAudioStream();
    this.stopPlayback();
    this.ws?.close();
    this.ws = null;
    this.setConnectionState('DISCONNECTED');
    this.setVoiceState('IDLE');
  }

  public async startAudioStream(): Promise<boolean> {
    try {
      this.stopPlayback();
      this.lastCapturedTranscript = '';

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.inputAudioContext || this.inputAudioContext.state === 'closed') {
        this.inputAudioContext = new AudioCtx({ sampleRate: this.config.inputSampleRate });
      }
      if (this.inputAudioContext.state === 'suspended') await this.inputAudioContext.resume();

      this.micMediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });

      this.audioSourceNode = this.inputAudioContext.createMediaStreamSource(this.micMediaStream);
      this.micAnalyserNode = this.inputAudioContext.createAnalyser();
      this.micAnalyserNode.fftSize = 256;
      this.audioSourceNode.connect(this.micAnalyserNode);
      this.startMicVisualizer();

      if (this.isConnected() && this.ws?.readyState === WebSocket.OPEN) {
        this.audioProcessorNode = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
        this.audioProcessorNode.onaudioprocess = (e) => {
          if (!this.isMicStreaming || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
          const channelData = e.inputBuffer.getChannelData(0);
          let sumSquares = 0;
          for (let i = 0; i < channelData.length; i++) sumSquares += channelData[i] * channelData[i];
          const rms = Math.sqrt(sumSquares / channelData.length);
          if (this.voiceState === 'SPEAKING' && rms > 0.035) this.interrupt();

          const sourceRate = this.inputAudioContext?.sampleRate || 16000;
          const pcm = this.resampleFloat32(channelData, sourceRate, this.config.inputSampleRate);
          this.ws.send(JSON.stringify({ type: 'audio', audio: this.floatTo16BitPCMBase64(pcm) }));
        };
        this.audioSourceNode.connect(this.audioProcessorNode);
        this.audioProcessorNode.connect(this.inputAudioContext.destination);
      } else if (this.speechRecognition) {
        try { this.speechRecognition.start(); } catch { /* already running */ }
      }

      this.isMicStreaming = true;
      this.setVoiceState('LISTENING');
      return true;
    } catch (err: any) {
      console.warn('[GeminiLive] Error starting audio stream:', err);
      const msg = err?.name === 'NotAllowedError' ? 'Permiso de micrófono denegado en el navegador.' : 'No se pudo activar el micrófono.';
      this.notifyError(msg);
      this.setVoiceState('ERROR');
      return false;
    }
  }

  public stopAudioStream(): string {
    this.isMicStreaming = false;
    if (this.silenceTimer) { clearTimeout(this.silenceTimer); this.silenceTimer = null; }
    if (this.micAnimFrameId) { cancelAnimationFrame(this.micAnimFrameId); this.micAnimFrameId = null; }
    if (this.speechRecognition) { try { this.speechRecognition.stop(); } catch { /* noop */ } }
    try { this.audioSourceNode?.disconnect(); } catch { /* noop */ }
    try { this.audioProcessorNode?.disconnect(); } catch { /* noop */ }
    this.audioSourceNode = null;
    this.audioProcessorNode = null;
    this.micMediaStream?.getTracks().forEach((t) => t.stop());
    this.micMediaStream = null;
    if (this.voiceState === 'LISTENING') this.setVoiceState('IDLE');
    const captured = this.lastCapturedTranscript;
    this.lastCapturedTranscript = '';
    return captured;
  }

  public sendTextMessage(text: string) {
    const clean = text.trim();
    if (!clean || !this.isConnected() || this.ws?.readyState !== WebSocket.OPEN) return;
    this.stopPlayback();
    this.ws.send(JSON.stringify({ type: 'text', text: clean }));
    this.setVoiceState('THINKING');
  }

  public playActivationChime() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
      osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.16);
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
    } catch { /* noop */ }
  }

  public async playSpeech(base64Audio?: string, mimeType?: string, fallbackText?: string, onEnd?: () => void) {
    this.stopPlayback();
    const finished = () => { if (this.voiceState === 'SPEAKING') this.setVoiceState(this.isMicStreaming ? 'LISTENING' : 'IDLE'); onEnd?.(); };
    if (base64Audio) {
      this.setVoiceState('SPEAKING');
      await this.queuePCMPlaybackChunk(base64Audio);
      if (onEnd) {
        const check = () => this.activeBufferSources.length ? setTimeout(check, 100) : finished();
        setTimeout(check, 200);
      }
      return;
    }
    if (!fallbackText) return;

    this.setVoiceState('SPEAKING');
    try {
      const res = await fetch('/api/jarvis/tts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fallbackText, voiceName: this.config.voiceName }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          await this.queuePCMPlaybackChunk(data.audioBase64);
          if (onEnd) {
            const check = () => this.activeBufferSources.length ? setTimeout(check, 100) : finished();
            setTimeout(check, 200);
          }
          return;
        }
      }
    } catch { /* browser fallback below */ }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(fallbackText);
        utterance.lang = 'es-ES';
        utterance.rate = 1.05;
        const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('es') || v.name.toLowerCase().includes('spanish') || v.name.toLowerCase().includes('español'));
        if (voice) utterance.voice = voice;
        utterance.onend = finished;
        utterance.onerror = finished;
        window.speechSynthesis.speak(utterance);
      } catch { finished(); }
    } else finished();
  }

  public interrupt() {
    this.stopPlayback();
    if (this.ws?.readyState === WebSocket.OPEN) {
      try { this.ws.send(JSON.stringify({ type: 'interrupt' })); } catch { /* noop */ }
    }
    this.notifyInterrupted();
    this.setVoiceState(this.isMicStreaming ? 'LISTENING' : 'IDLE');
  }

  public stopPlayback() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    for (const source of this.activeBufferSources) {
      try { source.stop(); source.disconnect(); } catch { /* noop */ }
    }
    this.activeBufferSources = [];
    if (this.outputAudioContext) this.nextPlayTime = this.outputAudioContext.currentTime;
    if (this.voiceState === 'SPEAKING') this.setVoiceState(this.isMicStreaming ? 'LISTENING' : 'IDLE');
  }

  private handleServerMessage(data: any) {
    switch (data.type) {
      case 'connected':
        console.log('[GeminiLive] Handshake verified:', data);
        break;
      case 'inputTranscript':
        if (typeof data.text === 'string' && data.text.trim()) {
          const final = data.isFinal === true;
          const text = data.text.trim();
          this.lastCapturedTranscript = text;
          this.notifyTranscript(text, final, 'user');
          if (final) this.setVoiceState('THINKING');
        }
        break;
      case 'audio':
        if (data.audio) {
          this.setVoiceState('SPEAKING');
          void this.queuePCMPlaybackChunk(data.audio);
        }
        break;
      case 'text':
        if (data.text) this.notifyTranscript(data.text, false, 'model');
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
        this.notifyError(data.error || 'Error en Gemini Live');
        break;
      default:
        break;
    }
  }

  private async queuePCMPlaybackChunk(base64Data: string) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.outputAudioContext || this.outputAudioContext.state === 'closed') {
        this.outputAudioContext = new AudioCtx({ sampleRate: this.config.outputSampleRate });
      }
      if (this.outputAudioContext.state === 'suspended') await this.outputAudioContext.resume();
      if (!this.playbackAnalyserNode) {
        this.playbackAnalyserNode = this.outputAudioContext.createAnalyser();
        this.playbackAnalyserNode.fftSize = 256;
        this.playbackAnalyserNode.connect(this.outputAudioContext.destination);
        this.startPlaybackVisualizer();
      }
      const floatArray = this.base64PCM16ToFloat32(base64Data);
      const buffer = this.outputAudioContext.createBuffer(1, floatArray.length, this.config.outputSampleRate);
      buffer.getChannelData(0).set(floatArray);
      const source = this.outputAudioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.playbackAnalyserNode);
      const now = this.outputAudioContext.currentTime;
      this.nextPlayTime = Math.max(now, this.nextPlayTime);
      source.start(this.nextPlayTime);
      this.activeBufferSources.push(source);
      this.nextPlayTime += buffer.duration;
      source.onended = () => {
        const idx = this.activeBufferSources.indexOf(source);
        if (idx >= 0) this.activeBufferSources.splice(idx, 1);
        if (this.activeBufferSources.length === 0) {
          this.nextPlayTime = this.outputAudioContext?.currentTime || 0;
          if (this.voiceState === 'SPEAKING') this.setVoiceState(this.isMicStreaming ? 'LISTENING' : 'IDLE');
        }
      };
    } catch (e) {
      console.warn('[GeminiLive] PCM playback error:', e);
    }
  }

  private setConnectionState(state: LiveConnectionState) {
    if (this.connectionState === state) return;
    this.connectionState = state;
    this.listeners.forEach((l) => l.onConnectionChange?.(state));
  }

  public setVoiceState(state: VoiceState) {
    if (this.voiceState === state) return;
    this.voiceState = state;
    if (state === 'IDLE' || state === 'ERROR') this.notifyAudioLevel(0);
    this.listeners.forEach((l) => l.onVoiceStateChange?.(state));
  }

  private notifyAudioLevel(level: number) { this.listeners.forEach((l) => l.onAudioLevel?.(level)); }
  private notifyTranscript(text: string, isFinal: boolean, role: 'user' | 'model') { this.listeners.forEach((l) => l.onTranscript?.(text, isFinal, role)); }
  private notifyInterrupted() { this.listeners.forEach((l) => l.onInterrupted?.()); }
  private notifyTurnComplete() { this.listeners.forEach((l) => l.onTurnComplete?.()); }
  private notifyError(err: string) { this.listeners.forEach((l) => l.onError?.(err)); }

  private startMicVisualizer() {
    if (this.micAnimFrameId) return;
    const dataArray = new Uint8Array(this.micAnalyserNode?.frequencyBinCount || 128);
    const step = () => {
      if (this.micAnalyserNode && this.voiceState === 'LISTENING') {
        this.micAnalyserNode.getByteFrequencyData(dataArray);
        let sum = 0; for (const value of dataArray) sum += value;
        this.notifyAudioLevel(Math.min(1, Math.max(0, (sum / dataArray.length) / 120)));
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
        let sum = 0; for (const value of dataArray) sum += value;
        this.notifyAudioLevel(Math.min(1, Math.max(0, (sum / dataArray.length) / 128)));
      }
      this.playbackAnimFrameId = requestAnimationFrame(step);
    };
    step();
  }

  private resampleFloat32(input: Float32Array, sourceRate: number, targetRate: number): Float32Array {
    if (!Number.isFinite(sourceRate) || sourceRate <= 0 || sourceRate === targetRate) return input;
    const ratio = sourceRate / targetRate;
    const newLength = Math.max(1, Math.round(input.length / ratio));
    const output = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const position = i * ratio;
      const left = Math.floor(position);
      const right = Math.min(left + 1, input.length - 1);
      const weight = position - left;
      output[i] = input[left] * (1 - weight) + input[right] * weight;
    }
    return output;
  }

  private floatTo16BitPCMBase64(input: Float32Array): string {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const bytes = new Uint8Array(output.buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return window.btoa(binary);
  }

  private base64PCM16ToFloat32(base64: string): Float32Array {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
    return float32;
  }

  private initBrowserSpeechFallback() {
    if (typeof window === 'undefined') return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;
    this.speechRecognition = new SpeechRec();
    this.speechRecognition.continuous = true;
    this.speechRecognition.interimResults = true;
    this.speechRecognition.lang = 'es-ES';
    this.speechRecognition.onresult = (event: any) => {
      if (this.voiceState === 'SPEAKING') this.interrupt();
      let interim = '', final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += transcript; else interim += transcript;
      }
      const text = (final || interim).trim();
      if (!text) return;
      this.lastCapturedTranscript = text;
      this.notifyTranscript(text, Boolean(final), 'user');
      if (final) {
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
        this.silenceTimer = setTimeout(() => {
          if (this.voiceState === 'LISTENING' && this.lastCapturedTranscript.trim()) {
            const sendText = this.lastCapturedTranscript.trim();
            this.lastCapturedTranscript = '';
            this.notifyTranscript(sendText, true, 'user');
          }
        }, this.config.silenceThresholdMs);
      }
    };
    this.speechRecognition.onerror = (e: any) => {
      if (e?.error === 'not-allowed') {
        this.notifyError('Permiso de micrófono denegado en el navegador.');
        this.setVoiceState('ERROR');
      }
    };
    this.speechRecognition.onend = () => {
      if (this.isMicStreaming && !this.isConnected()) {
        try { this.speechRecognition.start(); } catch { /* noop */ }
      }
    };
  }
}

export const geminiLive = new GeminiLiveService();
export default geminiLive;
