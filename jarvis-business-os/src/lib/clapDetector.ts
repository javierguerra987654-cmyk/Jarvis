export type ClapSensitivity = 'low' | 'balanced' | 'high';

export interface ClapDetectorOptions {
  sensitivity?: ClapSensitivity;
  cooldownMs?: number;
  onClap: (confidence: number) => void;
  onAudioLevel?: (level: number) => void;
}

interface SensitivityConfig {
  rmsThreshold: number;
  peakThreshold: number;
  highFreqThreshold: number;
  minConfidence: number;
}

const CONFIG: Record<ClapSensitivity, SensitivityConfig> = {
  low: {
    rmsThreshold: 0.08,
    peakThreshold: 0.24,
    highFreqThreshold: 0.16,
    minConfidence: 0.45,
  },
  balanced: {
    rmsThreshold: 0.04,
    peakThreshold: 0.14,
    highFreqThreshold: 0.10,
    minConfidence: 0.35,
  },
  high: {
    rmsThreshold: 0.02,
    peakThreshold: 0.08,
    highFreqThreshold: 0.06,
    minConfidence: 0.25,
  },
};

export class ClapDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;

  private animationFrame: number | null = null;
  private lastDetection = 0;

  private readonly onClap: (confidence: number) => void;
  private readonly onAudioLevel?: (level: number) => void;
  private readonly cooldownMs: number;
  private sensitivity: ClapSensitivity;

  private buffer: Uint8Array | null = null;
  private running = false;
  private ambientRms = 0.02;

  constructor(options: ClapDetectorOptions) {
    this.onClap = options.onClap;
    this.onAudioLevel = options.onAudioLevel;
    this.cooldownMs = options.cooldownMs ?? 800;
    this.sensitivity = options.sensitivity ?? 'balanced';
  }

  async start(): Promise<void> {
    if (this.running) return;

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone API is not available.');
    }

    try {
      // Noise suppression and echo cancellation can suppress short sharp transients (claps).
      // We first try with raw audio capture, falling back if necessary.
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
      } catch {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
      }

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();

      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.05;
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;

      this.source.connect(this.analyser);
      this.buffer = new Uint8Array(this.analyser.fftSize);
      this.running = true;

      this.detectLoop();
    } catch (err) {
      this.running = false;
      this.cleanup();
      throw err;
    }
  }

  stop(): void {
    this.running = false;
    this.cleanup();
  }

  private cleanup(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    try {
      this.source?.disconnect();
    } catch {}
    this.source = null;

    try {
      this.analyser?.disconnect();
    } catch {}
    this.analyser = null;

    this.stream?.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {}
    });
    this.stream = null;

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        void this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    this.buffer = null;
  }

  setSensitivity(value: ClapSensitivity): void {
    this.sensitivity = value;
  }

  getSensitivity(): ClapSensitivity {
    return this.sensitivity;
  }

  isRunning(): boolean {
    return this.running;
  }

  /**
   * Manually trigger clap event for testing or simulation
   */
  triggerManualClap(): void {
    const now = performance.now();
    this.lastDetection = now;
    this.onClap(1.0);
  }

  private detectLoop = (): void => {
    if (!this.running || !this.analyser || !this.buffer) return;

    this.analyser.getByteTimeDomainData(this.buffer);

    const result = this.analyseTransient(this.buffer);

    if (this.onAudioLevel) {
      this.onAudioLevel(result.rms);
    }

    if (result.detected) {
      const now = performance.now();
      if (now - this.lastDetection >= this.cooldownMs) {
        this.lastDetection = now;
        console.log(`[CLAP DETECTOR] Transient Hand Clap triggered! Confidence: ${result.confidence.toFixed(2)}, Peak: ${result.peak.toFixed(2)}, RMS: ${result.rms.toFixed(3)}`);
        this.onClap(result.confidence);
      }
    }

    this.animationFrame = requestAnimationFrame(this.detectLoop);
  };

  private analyseTransient(
    data: Uint8Array,
  ): {
    detected: boolean;
    confidence: number;
    peak: number;
    rms: number;
  } {
    const config = CONFIG[this.sensitivity];

    let sumSquares = 0;
    let peak = 0;
    let highFreqEnergy = 0;

    const len = data.length;
    for (let i = 0; i < len; i++) {
      const normalized = (data[i] - 128) / 128;
      const absVal = Math.abs(normalized);

      sumSquares += normalized * normalized;
      if (absVal > peak) {
        peak = absVal;
      }

      if (i > 0) {
        const prev = (data[i - 1] - 128) / 128;
        const delta = Math.abs(normalized - prev);
        highFreqEnergy += delta * delta;
      }
    }

    const rms = Math.sqrt(sumSquares / len);
    const highFreqRatio = sumSquares > 0 ? Math.min(1, highFreqEnergy / (sumSquares * 2)) : 0;

    // Track rolling ambient noise floor
    this.ambientRms = this.ambientRms * 0.95 + rms * 0.05;

    // Check conditions for a sharp percussive transient:
    // 1. Peak above absolute sensitivity threshold
    // 2. RMS jump above ambient noise or absolute threshold
    // 3. High-frequency rapid delta ratio characteristic of a clap
    const isPeakSufficient = peak >= config.peakThreshold;
    const isRmsSufficient = rms >= config.rmsThreshold || (rms > this.ambientRms * 2.2 && peak > config.peakThreshold * 0.8);
    const isHighFreqSufficient = highFreqRatio >= config.highFreqThreshold;

    if (!isPeakSufficient || !isRmsSufficient) {
      return {
        detected: false,
        confidence: 0,
        peak,
        rms,
      };
    }

    // Calculate normalized confidence score
    const peakScore = Math.min(1, peak / 0.5);
    const rmsScore = Math.min(1, rms / 0.2);
    const freqScore = Math.min(1, highFreqRatio / 0.4);

    const confidence = (peakScore * 0.45) + (rmsScore * 0.35) + (freqScore * 0.20);
    const detected = confidence >= config.minConfidence;

    return {
      detected,
      confidence: Math.min(1, confidence),
      peak,
      rms,
    };
  }
}
