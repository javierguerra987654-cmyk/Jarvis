import { VoiceState } from '../types.js';

export interface LiveClientCallbacks {
  onStateChange: (state: VoiceState) => void;
  onAudioLevel: (level: number) => void;
  onTranscript: (text: string, isFinal: boolean, role: 'user' | 'model') => void;
  onError: (error: string) => void;
  onInterrupted: () => void;
  onTurnComplete: () => void;
}

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private micAnalyserNode: AnalyserNode | null = null;
  private nextStartTime: number = 0;
  private activeAudioSources: AudioBufferSourceNode[] = [];
  private callbacks: Set<LiveClientCallbacks> = new Set();
  private state: VoiceState = 'IDLE';
  private currentVoice: string = 'Zephyr';
  private isConnected: boolean = false;
  private isListeningActive: boolean = false;
  private animFrameId: number | null = null;
  private micAnimFrameId: number | null = null;
  private speechRecognition: any = null;
  private silenceTimer: any = null;
  private lastCapturedTranscript: string = '';

  constructor() {
    this.initSpeechRecognition();
  }

  private initSpeechRecognition() {
    if (typeof window === 'undefined') return;
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      this.speechRecognition = new SpeechRec();
      this.speechRecognition.continuous = true;
      this.speechRecognition.interimResults = true;
      this.speechRecognition.lang = 'es-ES';

      this.speechRecognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const currentText = (finalTranscript || interimTranscript).trim();
        if (currentText) {
          this.lastCapturedTranscript = currentText;
          this.notifyTranscript(currentText, Boolean(finalTranscript), 'user');

          if (this.silenceTimer) clearTimeout(this.silenceTimer);
          if (finalTranscript) {
            this.silenceTimer = setTimeout(() => {
              if (this.state === 'LISTENING' && this.lastCapturedTranscript.trim()) {
                const textToSend = this.lastCapturedTranscript.trim();
                this.lastCapturedTranscript = '';
                this.stopMicrophone();
                this.notifyTranscript(textToSend, true, 'user');
              }
            }, 1400);
          }
        }
      };

      this.speechRecognition.onerror = (e: any) => {
        if (e.error === 'not-allowed') {
          this.notifyError('Permiso de micrófono denegado en el navegador.');
          this.setState('ERROR');
        }
      };

      this.speechRecognition.onend = () => {
        if (this.isListeningActive && !this.isConnected) {
          try {
            this.speechRecognition.start();
          } catch (e) {
            // Already started or active
          }
        }
      };
    }
  }

  public addListener(cb: LiveClientCallbacks): () => void {
    this.callbacks.add(cb);
    return () => this.callbacks.delete(cb);
  }

  public getState(): VoiceState {
    return this.state;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public setVoice(voice: string) {
    this.currentVoice = voice;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'changeVoice', voiceName: voice }));
    }
  }

  public setState(newState: VoiceState) {
    if (this.state !== newState) {
      this.state = newState;
      if (newState === 'IDLE' || newState === 'ERROR') {
        this.notifyAudioLevel(0);
      }
      this.callbacks.forEach((cb) => cb.onStateChange(newState));
    }
  }

  private notifyAudioLevel(level: number) {
    this.callbacks.forEach((cb) => cb.onAudioLevel(level));
  }

  private notifyTranscript(text: string, isFinal: boolean, role: 'user' | 'model') {
    this.callbacks.forEach((cb) => cb.onTranscript(text, isFinal, role));
  }

  private notifyError(err: string) {
    this.callbacks.forEach((cb) => cb.onError(err));
  }

  private notifyInterrupted() {
    this.callbacks.forEach((cb) => cb.onInterrupted());
  }

  private notifyTurnComplete() {
    this.callbacks.forEach((cb) => cb.onTurnComplete());
  }

  /**
   * Connects to the Gemini Live WebSocket endpoint on the server
   */
  public async connect(): Promise<boolean> {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      return true;
    }

    this.disconnect();

    return new Promise((resolve) => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/live-ws`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('[LiveClient] WebSocket handshake initialized');
        };

        this.ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleServerMessage(data);
            if (data.type === 'connected') {
              this.isConnected = true;
              this.setState('IDLE');
              resolve(true);
            }
          } catch (e) {
            console.warn('[LiveClient] Message parse warning:', e);
          }
        };

        this.ws.onerror = () => {
          // Graceful fallback without breaking user interface
          console.log('[LiveClient] Live WebSocket fallback mode activated (HTTP voice streaming active)');
          this.isConnected = false;
          this.setState('IDLE');
          resolve(false);
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          if (this.isListeningActive && !this.micStream) {
            this.setState('IDLE');
          }
        };

        // Safety timeout
        setTimeout(() => {
          if (!this.isConnected) {
            this.setState('IDLE');
            resolve(false);
          }
        }, 3000);
      } catch (err: any) {
        console.log('[LiveClient] WebSocket exception, fallback active:', err);
        this.isConnected = false;
        this.setState('IDLE');
        resolve(false);
      }
    });
  }

  /**
   * Disconnects the live session and stops all audio
   */
  public disconnect() {
    this.stopMicrophone();
    this.stopPlayback();
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        // ignore
      }
      this.ws = null;
    }
    this.isConnected = false;
    this.setState('IDLE');
  }

  /**
   * Starts bidirectional microphone streaming (Live WebSocket or Audio Analyser fallback)
   */
  public async startMicrophone(): Promise<boolean> {
    try {
      this.stopPlayback(); // Interrupt any playing speech
      this.lastCapturedTranscript = '';

      // Initialize input AudioContext
      if (!this.inputAudioCtx || this.inputAudioCtx.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.inputAudioCtx = new AudioCtx({ sampleRate: 16000 });
      }
      if (this.inputAudioCtx.state === 'suspended') {
        await this.inputAudioCtx.resume();
      }

      // Request microphone stream
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });

      this.sourceNode = this.inputAudioCtx.createMediaStreamSource(this.micStream);
      this.micAnalyserNode = this.inputAudioCtx.createAnalyser();
      this.micAnalyserNode.fftSize = 256;
      this.sourceNode.connect(this.micAnalyserNode);

      // Start mic visualization loop for RMS indicator
      this.startMicVisualizerLoop();

      // If connected to Live WebSocket, attach ScriptProcessor for raw PCM streaming
      if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.processorNode = this.inputAudioCtx.createScriptProcessor(4096, 1, 1);
        this.processorNode.onaudioprocess = (e) => {
          if (!this.isListeningActive || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
          }

          const inputChannelData = e.inputBuffer.getChannelData(0);
          const base64Audio = this.floatTo16BitPCMBase64(inputChannelData);

          this.ws.send(
            JSON.stringify({
              type: 'audio',
              audio: base64Audio,
            })
          );
        };

        this.sourceNode.connect(this.processorNode);
        this.processorNode.connect(this.inputAudioCtx.destination);
      } else {
        // Fallback: Start Speech Recognition
        if (this.speechRecognition) {
          try {
            this.speechRecognition.start();
          } catch (e) {
            // ignore
          }
        }
      }

      this.isListeningActive = true;
      this.setState('LISTENING');
      return true;
    } catch (err: any) {
      console.warn('[LiveClient] Microphone capture error:', err);
      this.notifyError(
        err.name === 'NotAllowedError'
          ? 'Permiso de micrófono denegado en el navegador.'
          : 'No se pudo acceder al micrófono.'
      );
      this.setState('ERROR');
      return false;
    }
  }

  /**
   * Stops microphone streaming
   */
  public stopMicrophone(): string {
    this.isListeningActive = false;
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

    if (this.sourceNode && this.processorNode) {
      try {
        this.sourceNode.disconnect();
        this.processorNode.disconnect();
      } catch (e) {
        // ignore
      }
      this.sourceNode = null;
      this.processorNode = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    if (this.state === 'LISTENING') {
      this.setState('IDLE');
    }

    const finalCaptured = this.lastCapturedTranscript;
    this.lastCapturedTranscript = '';
    return finalCaptured;
  }

  /**
   * Sends text message
   */
  public sendText(text: string) {
    if (!text.trim()) return;
    this.stopPlayback();

    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'text', text }));
      this.setState('THINKING');
    }
  }

  /**
   * Handle incoming messages from the Live API WebSocket
   */
  private handleServerMessage(data: any) {
    switch (data.type) {
      case 'connected':
        console.log('[LiveClient] Gemini Live session initialized successfully:', data);
        break;

      case 'audio':
        if (data.audio) {
          this.setState('SPEAKING');
          this.queueAudioChunk(data.audio);
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
        if (this.isListeningActive) {
          this.setState('LISTENING');
        } else {
          this.setState('IDLE');
        }
        break;

      case 'turnComplete':
        this.notifyTurnComplete();
        if (this.isListeningActive) {
          this.setState('LISTENING');
        } else {
          this.setState('IDLE');
        }
        break;

      case 'error':
        console.warn('[LiveClient] Live message notice:', data.error);
        break;

      default:
        break;
    }
  }

  /**
   * Play high-fidelity PCM 24kHz or Base64 speech from Gemini
   */
  public async playSpeech(base64Audio?: string, mimeType?: string, fallbackText?: string) {
    this.stopPlayback();

    if (base64Audio) {
      this.setState('SPEAKING');
      await this.queueAudioChunk(base64Audio);
    } else if (fallbackText && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.setState('SPEAKING');
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(fallbackText);
      utterance.lang = 'es-ES';
      utterance.rate = 1.05;

      utterance.onend = () => {
        if (this.state === 'SPEAKING') {
          this.setState(this.isListeningActive ? 'LISTENING' : 'IDLE');
        }
      };

      utterance.onerror = () => {
        if (this.state === 'SPEAKING') {
          this.setState(this.isListeningActive ? 'LISTENING' : 'IDLE');
        }
      };

      window.speechSynthesis.speak(utterance);
    }
  }

  /**
   * Queue raw 24kHz PCM audio chunks for gapless playback
   */
  private async queueAudioChunk(base64Data: string) {
    try {
      if (!this.outputAudioCtx || this.outputAudioCtx.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.outputAudioCtx = new AudioCtx({ sampleRate: 24000 });
      }
      if (this.outputAudioCtx.state === 'suspended') {
        await this.outputAudioCtx.resume();
      }

      // Ensure analyser node for live playback visualizer
      if (!this.analyserNode) {
        this.analyserNode = this.outputAudioCtx.createAnalyser();
        this.analyserNode.fftSize = 256;
        this.analyserNode.connect(this.outputAudioCtx.destination);
        this.startVisualizerLoop();
      }

      const float32Array = this.base6416BitPCMToFloat32(base64Data);
      const audioBuffer = this.outputAudioCtx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = this.outputAudioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.analyserNode);

      const currentTime = this.outputAudioCtx.currentTime;
      this.nextStartTime = Math.max(currentTime, this.nextStartTime);
      source.start(this.nextStartTime);

      this.activeAudioSources.push(source);
      this.nextStartTime += audioBuffer.duration;

      source.onended = () => {
        const index = this.activeAudioSources.indexOf(source);
        if (index > -1) {
          this.activeAudioSources.splice(index, 1);
        }
        if (this.activeAudioSources.length === 0) {
          this.nextStartTime = this.outputAudioCtx ? this.outputAudioCtx.currentTime : 0;
          if (this.state === 'SPEAKING') {
            this.setState(this.isListeningActive ? 'LISTENING' : 'IDLE');
          }
        }
      };
    } catch (e) {
      console.warn('[LiveClient] Error queuing audio chunk:', e);
    }
  }

  /**
   * Stops currently playing audio immediately (Interruption / Barge-in)
   */
  public stopPlayback() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    for (const source of this.activeAudioSources) {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // ignore
      }
    }
    this.activeAudioSources = [];
    if (this.outputAudioCtx) {
      this.nextStartTime = this.outputAudioCtx.currentTime;
    }
    if (this.state === 'SPEAKING') {
      this.setState(this.isListeningActive ? 'LISTENING' : 'IDLE');
    }
  }

  /**
   * Helper: Float32Array to 16-bit PCM little-endian Base64
   */
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

  /**
   * Helper: 16-bit PCM Base64 to Float32Array
   */
  private base6416BitPCMToFloat32(base64: string): Float32Array {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }
    return float32Array;
  }

  /**
   * Visualizer loop for input microphone RMS meter
   */
  private startMicVisualizerLoop() {
    if (this.micAnimFrameId) return;

    const dataArray = new Uint8Array(this.micAnalyserNode?.frequencyBinCount || 128);

    const update = () => {
      if (this.micAnalyserNode && this.state === 'LISTENING') {
        this.micAnalyserNode.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(1, Math.max(0, avg / 120));
        this.notifyAudioLevel(normalized);
      }
      this.micAnimFrameId = requestAnimationFrame(update);
    };

    update();
  }

  /**
   * Visualizer loop for output playback RMS meter
   */
  private startVisualizerLoop() {
    if (this.animFrameId) return;

    const dataArray = new Uint8Array(this.analyserNode?.frequencyBinCount || 128);

    const update = () => {
      if (this.analyserNode && this.state === 'SPEAKING') {
        this.analyserNode.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(1, Math.max(0, avg / 128));
        this.notifyAudioLevel(normalized);
      }
      this.animFrameId = requestAnimationFrame(update);
    };

    update();
  }
}

export const geminiLiveClient = new GeminiLiveClient();
