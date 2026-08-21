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

// Conservative defaults: the detector should wake JARVIS only on a
// convincing transient, not on ordinary speech or keyboard noise.
const CONFIG: Record<ClapSensitivity, SensitivityConfig> = {
  low: {
    rmsThreshold: 0.09,
    peakThreshold: 0.26,
    highFreqThreshold: 0.18,
    minConfidence: 0.68,
  },
  balanced: {
    rmsThreshold: 0.055,
    peakThreshold: 0.18,
    highFreqThreshold: 0.12,
    minConfidence: 0.58,
  },
  high: {
    rmsThreshold: 0.035,
    peakThreshold: 0.11,
    highFreqThreshold: 0.08,
    minConfidence: 0.50,
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
    this.cooldownMs = options.cooldownMs ?? 1000;
    this.sensitivity = options.sensitivity ?? 'balanced';
  }

  async start(): Promise<void> {
    if (this.running) return;

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone API is not available.');
    }

    try {
      // Raw capture is preferred because browser noise suppression can remove
      // the short transient that distinguishes a clap from speech.
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
      } catch {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.03;
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

    try { this.source?.disconnect(); } catch {}
    this.source = null;

    try { this.analyser?.disconnect(); } catch {}
    this.analyser = null;

    this.stream?.getTracks().forEach((track) => {
      try { track.stop(); } catch {}
    });
    this.stream = null;

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { void this.audioContext.close(); } catch {}
    }
    this.audioContext = null;
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

  private detectLoop = (): void => {
    if (!this.running || !this.analyser || !this.buffer) return;

    this.analyser.getByteTimeDomainData(this.buffer);
    const result = this.analyseTransient(this.buffer);

    this.onAudioLevel?.(result.rms);

    if (result.detected) {
      const now = performance.now();
      if (now - this.lastDetection >= this.cooldownMs) {
        this.lastDetection = now;
        this.onClap(result.confidence);
      }
    }

    this.animationFrame = requestAnimationFrame(this.detectLoop);
  };

  private analyseTransient(data: Uint8Array): {
    detected: boolean;
    confidence: number;
    peak: number;
    rms: number;
  } {
    const config = CONFIG[this.sensitivity];

    let sumSquares = 0;
    let peak = 0;
    let highFreqEnergy = 0;

    for (let i = 0; i < data.length; i++) {
      const normalized = (data[i] - 128) / 128;
      const absVal = Math.abs(normalized);
      sumSquares += normalized * normalized;
      peak = Math.max(peak, absVal);

      if (i > 0) {
        const previous = (data[i - 1] - 128) / 128;
        const delta = Math.abs(normalized - previous);
        highFreqEnergy += delta * delta;
      }
    }

    const rms = Math.sqrt(sumSquares / data.length);
    const highFreqRatio = sumSquares > 0
      ? Math.min(1, highFreqEnergy / (sumSquares * 2))
      : 0;

    // Slowly follow the room noise floor. A clap must be a clear transient
    // above the ambient level, which reduces false positives from speech.
    this.ambientRms = this.ambientRms * 0.97 + rms * 0.03;

    const peakSufficient = peak >= config.peakThreshold;
    const rmsSufficient =
      rms >= config.rmsThreshold ||
      (rms > this.ambientRms * 2.5 && peak > config.peakThreshold * 0.9);
    const highFreqSufficient = highFreqRatio >= config.highFreqThreshold;

    if (!peakSufficient || !rmsSufficient || !highFreqSufficient) {
      return { detected: false, confidence: 0, peak, rms };
    }

    const peakScore = Math.min(1, peak / 0.55);
    const rmsScore = Math.min(1, rms / 0.22);
    const freqScore = Math.min(1, highFreqRatio / 0.45);

    const confidence =
      peakScore * 0.45 +
      rmsScore * 0.30 +
      freqScore * 0.25;

    return {
      detected: confidence >= config.minConfidence,
      confidence: Math.min(1, confidence),
      peak,
      rms,
    };
  }
}
