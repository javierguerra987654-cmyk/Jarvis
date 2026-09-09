"use client";

import { useEffect, useRef, useState } from "react";

const WAKE_WORDS = ["jarvis", "j.a.r.v.i.s", "j a r v i s"];
const SILENCE_MS = 900;
const START_THRESHOLD = 0.025;
const END_THRESHOLD = 0.012;

type VoiceState = "OFF" | "WAKE" | "LISTENING" | "PROCESSING" | "UNAVAILABLE";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
type VoiceWindow = { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };

function normalize(text: string) {
  return text
    .toLocaleLowerCase("es-ES")
    .replace(/[.,!?;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractCommand(text: string) {
  const normalized = normalize(text);
  for (const wakeWord of WAKE_WORDS) {
    const marker = normalize(wakeWord);
    const index = normalized.indexOf(marker);
    if (index >= 0) return normalized.slice(index + marker.length).trim();
  }
  return null;
}

export default function VoiceController() {
  const [state, setState] = useState<VoiceState>("OFF");
  const [level, setLevel] = useState(0);
  const stateRef = useRef<VoiceState>("OFF");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const silenceSinceRef = useRef<number | null>(null);
  const heardSpeechRef = useRef(false);
  const commandRef = useRef("");
  const modeRef = useRef<"wake" | "command">("wake");
  const stoppingRef = useRef(false);

  function updateState(next: VoiceState) {
    stateRef.current = next;
    setState(next);
  }

  useEffect(() => {
    const browserWindow = window as unknown as VoiceWindow;
    const RecognitionCtor = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
    if (!RecognitionCtor || !navigator.mediaDevices?.getUserMedia) {
      updateState("UNAVAILABLE");
      return;
    }

    const micButton = document.querySelector('button[aria-label="Iniciar entrada de voz"]') as HTMLButtonElement | null;

    async function stop() {
      stoppingRef.current = true;
      recognitionRef.current?.stop();
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      await audioContextRef.current?.close().catch(() => undefined);
      audioContextRef.current = null;
      analyserRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      silenceSinceRef.current = null;
      heardSpeechRef.current = false;
      commandRef.current = "";
      modeRef.current = "wake";
      setLevel(0);
      updateState("OFF");
      if (micButton) micButton.setAttribute("aria-label", "Iniciar entrada de voz");
    }

    async function submitCommand(command: string) {
      const text = command.trim();
      if (!text || text.length < 2) return;
      const input = document.querySelector('input[placeholder*="Dale una instrucción"]') as HTMLInputElement | null;
      const form = input?.closest("form") as HTMLFormElement | null;
      if (!input || !form) return;
      input.focus();
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, text);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      updateState("PROCESSING");
      window.setTimeout(() => form.requestSubmit(), 30);
    }

    function setupAnalyser(stream: MediaStream) {
      const audioContext = new AudioContext({ latencyHint: "interactive" });
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.72;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      const samples = new Uint8Array(analyser.fftSize);

      const tick = () => {
        const currentAnalyser = analyserRef.current;
        if (!currentAnalyser || stoppingRef.current) return;
        currentAnalyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const value of samples) {
          const centered = (value - 128) / 128;
          sum += centered * centered;
        }
        const rms = Math.sqrt(sum / samples.length);
        setLevel(Math.min(1, rms * 3.8));
        const now = performance.now();

        if (rms >= START_THRESHOLD) {
          heardSpeechRef.current = true;
          silenceSinceRef.current = null;
          if (modeRef.current === "command" && stateRef.current !== "PROCESSING") updateState("LISTENING");
        } else if (modeRef.current === "command" && heardSpeechRef.current && stateRef.current !== "PROCESSING") {
          if (rms <= END_THRESHOLD) {
            if (silenceSinceRef.current == null) silenceSinceRef.current = now;
            if (now - silenceSinceRef.current >= SILENCE_MS) {
              const command = commandRef.current.trim();
              commandRef.current = "";
              heardSpeechRef.current = false;
              silenceSinceRef.current = null;
              modeRef.current = "wake";
              updateState("WAKE");
              if (command) void submitCommand(command);
            }
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }

    function startRecognition() {
      const recognition = new RecognitionCtor();
      recognition.lang = "es-ES";
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.onresult = (event) => {
        for (let i = 0; i < event.results.length; i += 1) {
          const transcript = event.results[i]?.[0]?.transcript ?? "";
          if (!transcript) continue;

          if (modeRef.current === "wake") {
            const command = extractCommand(transcript);
            if (command !== null) {
              modeRef.current = "command";
              commandRef.current = command;
              heardSpeechRef.current = false;
              silenceSinceRef.current = null;
              updateState("LISTENING");
              if (command) heardSpeechRef.current = true;
            }
          } else {
            const normalized = normalize(transcript);
            if (normalized === "jarvis") continue;
            const afterWake = extractCommand(transcript);
            commandRef.current += ` ${afterWake !== null ? afterWake : normalized}`;
            updateState("LISTENING");
          }
        }
      };
      recognition.onerror = () => {
        if (!stoppingRef.current && stateRef.current !== "PROCESSING") updateState("WAKE");
      };
      recognition.onend = () => {
        if (!stoppingRef.current && stateRef.current !== "PROCESSING") {
          try {
            recognition.start();
          } catch {
            // Browser may reject an immediate restart; the next event can recover.
          }
        }
      };
      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch {
        updateState("WAKE");
      }
    }

    async function start() {
      if (stateRef.current !== "OFF") return;
      stoppingRef.current = false;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
          },
        });
        streamRef.current = stream;
        setupAnalyser(stream);
        modeRef.current = "wake";
        commandRef.current = "";
        updateState("WAKE");
        if (micButton) micButton.setAttribute("aria-label", "Detener entrada de voz");
        startRecognition();
      } catch {
        updateState("OFF");
      }
    }

    const onMicClick = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (stateRef.current === "OFF") void start(); else void stop();
    };

    micButton?.addEventListener("click", onMicClick, true);
    if (micButton) micButton.setAttribute("data-voice-controller", "active");

    return () => {
      micButton?.removeEventListener("click", onMicClick, true);
      void stop();
    };
  }, []);

  const label = state === "WAKE" ? "ESPERANDO · JARVIS" : state === "LISTENING" ? "ESCUCHANDO" : state === "PROCESSING" ? "PROCESANDO" : state === "UNAVAILABLE" ? "VOZ NO DISPONIBLE" : "VOZ OFF";

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-cyan-200/15 bg-slate-950/80 px-3 py-2 text-[10px] tracking-[0.16em] text-slate-300 shadow-2xl backdrop-blur">
      <span className="mr-2 inline-block size-2 rounded-full bg-cyan-300" style={{ opacity: state === "WAKE" || state === "LISTENING" ? Math.max(0.35, level) : 0.35 }} />
      {label}
      {state === "WAKE" ? <span className="ml-2 text-slate-500">di “JARVIS”</span> : null}
    </div>
  );
}
