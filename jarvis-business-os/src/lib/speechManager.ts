/**
 * JARVIS Voice & Audio Engine
 * Handles microphone capture, real-time audio visualization,
 * Gemini TTS playback (PCM 24kHz), interruption handling, and fallback speech synthesis.
 */

export interface VoiceStateListener {
  onStateChange: (state: 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'ERROR') => void;
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onAudioLevel?: (level: number) => void;
  onError?: (error: string) => void;
}

export class JarvisSpeechManager {
  private state: 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'ERROR' = 'IDLE';
  private audioContext: AudioContext | null = null;
  private currentSourceNode: AudioBufferSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private recognition: any = null;
  private listeners: VoiceStateListener[] = [];
  private isMuted: boolean = false;
  private selectedVoice: string = 'Zephyr';
  private animFrameId: number | null = null;
  private silenceTimer: any = null;
  private lastTranscript: string = '';

  constructor() {
    this.initRecognition();
  }

  private initAudioContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtxClass();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  private initRecognition() {
    if (typeof window === 'undefined') return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'es-ES';

      this.recognition.onresult = (event: any) => {
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

        const currentText = finalTranscript || interimTranscript;
        if (currentText) {
          this.lastTranscript = currentText;
          this.notifyTranscript(currentText, Boolean(finalTranscript));

          // Reset silence timer
          if (this.silenceTimer) clearTimeout(this.silenceTimer);
          if (finalTranscript) {
            this.silenceTimer = setTimeout(() => {
              if (this.state === 'LISTENING' && this.lastTranscript.trim()) {
                this.stopListening();
              }
            }, 1200);
          }
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('[Speech Recognition Error]:', event.error);
        if (event.error === 'not-allowed') {
          this.notifyError('Permiso de micrófono denegado. Permite el acceso para hablar con JARVIS.');
          this.setState('ERROR');
        }
      };

      this.recognition.onend = () => {
        if (this.state === 'LISTENING') {
          // If still marked as listening, restart or transition
          try {
            this.recognition.start();
          } catch (e) {
            // Already active or stopped
          }
        }
      };
    }
  }

  public addListener(listener: VoiceStateListener) {
    this.listeners.push(listener);
    listener.onStateChange(this.state);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private setState(newState: 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'ERROR') {
    this.state = newState;
    this.listeners.forEach((l) => l.onStateChange(newState));
  }

  private notifyTranscript(text: string, isFinal: boolean) {
    this.listeners.forEach((l) => l.onTranscript(text, isFinal));
  }

  private notifyError(err: string) {
    this.listeners.forEach((l) => l.onError && l.onError(err));
  }

  public getState() {
    return this.state;
  }

  public isVoiceMuted() {
    return this.isMuted;
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.state === 'SPEAKING') {
      this.stopSpeaking();
    }
    return this.isMuted;
  }

  public setVoice(voice: string) {
    this.selectedVoice = voice;
  }

  /**
   * Starts listening to the user's voice
   * If JARVIS is currently speaking, it interrupts immediately!
   */
  public async startListening(): Promise<boolean> {
    // Interruption logic: if speaking, cancel speech immediately
    if (this.state === 'SPEAKING') {
      this.stopSpeaking();
    }

    this.lastTranscript = '';
    const ctx = this.initAudioContext();

    try {
      if (!this.mediaStream) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      }

      // Audio analysis for orb visualization
      const source = ctx.createMediaStreamSource(this.mediaStream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      this.startAudioLevelLoop();

      if (this.recognition) {
        try {
          this.recognition.start();
        } catch (e) {
          // May already be started
        }
      }

      this.setState('LISTENING');
      return true;
    } catch (err: any) {
      console.error('[JARVIS Voice] Mic access error:', err);
      this.notifyError('No se pudo acceder al micrófono. Verifica los permisos.');
      this.setState('ERROR');
      return false;
    }
  }

  public stopListening(): string {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }
    this.stopAudioLevelLoop();

    const recorded = this.lastTranscript;
    this.setState('THINKING');
    return recorded;
  }

  public cancelListening() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }
    this.stopAudioLevelLoop();
    this.setState('IDLE');
  }

  /**
   * Stop current audio playback immediately (Interruption)
   */
  public stopSpeaking() {
    if (this.currentSourceNode) {
      try {
        this.currentSourceNode.stop();
        this.currentSourceNode.disconnect();
      } catch (e) {
        // Source might already have ended
      }
      this.currentSourceNode = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    this.stopAudioLevelLoop();
    if (this.state === 'SPEAKING') {
      this.setState('IDLE');
    }
  }

  /**
   * Play speech audio from base64 PCM / audio data returned by Gemini TTS
   */
  public async playSpeech(
    audioBase64?: string,
    mimeType: string = 'audio/pcm;rate=24000',
    fallbackText?: string
  ): Promise<void> {
    if (this.isMuted) {
      this.setState('IDLE');
      return;
    }

    this.stopSpeaking();
    this.setState('SPEAKING');

    const ctx = this.initAudioContext();

    if (audioBase64) {
      try {
        let audioBuffer: AudioBuffer;

        if (mimeType.includes('pcm')) {
          // Parse sample rate
          const rateMatch = mimeType.match(/rate=(\d+)/);
          const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
          audioBuffer = this.decodePcm16(audioBase64, sampleRate, ctx);
        } else {
          // Standard audio format
          const binary = window.atob(audioBase64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          audioBuffer = await ctx.decodeAudioData(bytes.buffer);
        }

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;

        this.analyser = ctx.createAnalyser();
        this.analyser.fftSize = 64;
        source.connect(this.analyser);
        this.analyser.connect(ctx.destination);

        this.currentSourceNode = source;
        this.startAudioLevelLoop();

        source.onended = () => {
          this.stopAudioLevelLoop();
          this.currentSourceNode = null;
          if (this.state === 'SPEAKING') {
            this.setState('IDLE');
          }
        };

        source.start(0);
        return;
      } catch (pcmErr) {
        console.warn('[JARVIS Voice] PCM decoding notice, switching to browser TTS fallback:', pcmErr);
      }
    }

    // Fallback to browser SpeechSynthesis if audioBase64 unavailable or failed
    if (fallbackText && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const cleanText = fallbackText
        .replace(/[*_~`#]/g, '')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        .replace(/\n+/g, '. ')
        .substring(0, 500);

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'es-ES';
      utterance.rate = 1.05;
      utterance.pitch = 0.95;

      utterance.onend = () => {
        if (this.state === 'SPEAKING') {
          this.setState('IDLE');
        }
      };

      utterance.onerror = () => {
        if (this.state === 'SPEAKING') {
          this.setState('IDLE');
        }
      };

      window.speechSynthesis.speak(utterance);
    } else {
      this.setState('IDLE');
    }
  }

  private decodePcm16(base64: string, sampleRate: number, ctx: AudioContext): AudioBuffer {
    const binary = window.atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const buffer = ctx.createBuffer(1, int16.length, sampleRate);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < int16.length; i++) {
      channelData[i] = int16[i] / 32768.0;
    }
    return buffer;
  }

  private startAudioLevelLoop() {
    this.stopAudioLevelLoop();
    const update = () => {
      if (this.analyser) {
        const data = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          sum += data[i];
        }
        const avg = sum / data.length;
        const normalized = Math.min(1, avg / 128);
        this.listeners.forEach((l) => l.onAudioLevel && l.onAudioLevel(normalized));
      }
      this.animFrameId = requestAnimationFrame(update);
    };
    this.animFrameId = requestAnimationFrame(update);
  }

  private stopAudioLevelLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.listeners.forEach((l) => l.onAudioLevel && l.onAudioLevel(0));
  }

  public setThinking() {
    this.setState('THINKING');
  }

  public setIdle() {
    this.setState('IDLE');
  }
}

export const speechManager = new JarvisSpeechManager();
