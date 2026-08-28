"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Activity, ArrowUpRight, BrainCircuit, CalendarClock, CheckCircle2, ChevronRight, Cpu, Database, Github, Mic, Orbit, Send, ShieldCheck, Sparkles, Target, X, Zap } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };
type Memory = { id: string; content: string; category: "fact" | "preference" | "goal" | "context"; importance: number; createdAt: string };
type Integration = { id: string; configured: boolean; mode: "REAL" | "DISCONNECTED"; capabilities: string[] };
type SystemStatus = { model: string; memory: boolean; integrations: Integration[]; configuredIntegrations: number };
type SpeechRecognitionResultItem = { transcript: string };
type SpeechRecognitionResult = { [index: number]: SpeechRecognitionResultItem; length: number };
type SpeechRecognitionResultList = { [index: number]: SpeechRecognitionResult; length: number };
type SpeechRecognitionEvent = { results: SpeechRecognitionResultList };
type SpeechRecognition = { lang: string; interimResults: boolean; continuous: boolean; onresult: ((event: SpeechRecognitionEvent) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void; stop: () => void; abort: () => void };
type SpeechRecognitionConstructor = new () => SpeechRecognition;

declare global { interface Window { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor } }

const memoryLabels = { fact: "Dato", preference: "Preferencia", goal: "Objetivo", context: "Contexto" };
const iconByIntegration: Record<string, typeof Github> = { github: Github, calendar: CalendarClock, gmail: Send, shopify: Database, web: BrainCircuit, automation: Activity };

export default function JarvisShell() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [system, setSystem] = useState<SystemStatus | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [godMode, setGodMode] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const status = busy ? "THINKING" : listening ? "LISTENING" : sessionReady ? "ONLINE" : "CONNECTING";
  const messageCount = useMemo(() => messages.length, [messages.length]);
  const connected = system?.configuredIntegrations ?? 0;

  async function refreshCommandCenter() {
    const [statusResponse, memoryResponse] = await Promise.all([
      fetch("/api/status", { cache: "no-store" }),
      fetch("/api/memory", { credentials: "include", cache: "no-store" }),
    ]);
    if (statusResponse.ok) setSystem(await statusResponse.json());
    if (memoryResponse.ok) setMemories((await memoryResponse.json()).memories ?? []);
  }

  useEffect(() => {
    fetch("/api/session", { credentials: "include", cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("No se pudo iniciar la sesión.");
        return response.json();
      })
      .then(async () => { setSessionReady(true); await refreshCommandCenter(); })
      .catch((error) => setMessages([{ role: "assistant", content: `Sistema: ${error instanceof Error ? error.message : "Error de sesión."}` }]));
  }, []);

  useEffect(() => () => {
    recognitionRef.current?.abort();
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  function speak(text: string) {
    if (!voiceEnabled || typeof window === "undefined" || !("speechSynthesis" in window) || !text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-ES";
    utterance.rate = 1.02;
    utterance.pitch = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function toggleVoice() {
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceEnabled(false);
      setMessages((current) => [...current, { role: "assistant", content: "Sistema: el navegador no ofrece reconocimiento de voz. El modo texto continúa disponible." }]);
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "es-ES";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => setInput(event.results[0]?.[0]?.transcript ?? "");
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  function activateGodMode() {
    setGodMode(true);
    setInput("Activa Modo Dios. Hazme las preguntas mínimas necesarias y construye el plan de máximo impacto para mi objetivo, con prioridades, riesgos, métricas y la primera acción ejecutable.");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy || !sessionReady) return;
    setMessages((current) => [...current, { role: "user", content: text }]);
    setInput(""); setBusy(true);
    try {
      const response = await fetch("/api/jarvis", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, history: messages.slice(-20) }) });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "No se pudo conectar con JARVIS.");
      }
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let assistant = ""; let pending = "";
      setMessages((current) => [...current, { role: "assistant", content: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        pending += decoder.decode(value, { stream: !done });
        const lines = pending.split("\n"); pending = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6); if (data === "[DONE]") continue;
          const parsed = JSON.parse(data) as { delta?: string; error?: string };
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.delta) { assistant += parsed.delta; setMessages((current) => [...current.slice(0, -1), { role: "assistant", content: assistant }]); }
        }
        if (done) break;
      }
      speak(assistant); await refreshCommandCenter();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido.";
      setMessages((current) => [...current, { role: "assistant", content: `Sistema: ${message}` }]);
    } finally { setBusy(false); }
  }

  return <main className="relative min-h-screen overflow-hidden px-4 py-4 md:px-8 md:py-6">
    <div className="hud-grid pointer-events-none absolute inset-0" />
    <section className="relative mx-auto max-w-7xl">
      <header className="mb-5 flex items-center justify-between border-b border-white/8 pb-4">
        <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/5 text-cyan-200"><Sparkles size={18} /></div><div><div className="text-sm font-semibold tracking-[0.28em] text-white">J.A.R.V.I.S.</div><div className="text-[10px] tracking-[0.2em] text-slate-500">PERSONAL + BUSINESS COMMAND CENTER</div></div></div>
        <div className="flex items-center gap-3 text-[11px] tracking-[0.14em] text-slate-400"><span className="flex items-center gap-2"><Activity size={13} className="text-emerald-300" />{status}</span><span className="hidden items-center gap-2 sm:flex"><ShieldCheck size={13} /> PRIVATE CORE</span></div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[250px_minmax(0,1fr)_290px]">
        <aside className="space-y-5">
          <section className={`god-card rounded-2xl p-5 ${godMode ? "god-card-active" : ""}`}><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-xs tracking-[.18em] text-cyan-100"><Orbit size={15} />MODO DIOS</div><span className={`size-2 rounded-full ${godMode ? "bg-cyan-200 shadow-[0_0_12px_rgba(151,234,255,.9)]" : "bg-slate-600"}`} /></div><p className="text-xs leading-5 text-slate-400">Estrategia, foco y decisiones de alto impacto. JARVIS prepara; tú mantienes el control.</p><button type="button" onClick={activateGodMode} className="mt-4 flex w-full items-center justify-between rounded-xl border border-cyan-200/20 bg-cyan-200/[.07] px-3 py-2.5 text-[10px] font-medium tracking-[.14em] text-cyan-100 transition hover:border-cyan-200/45 hover:bg-cyan-200/[.12]">{godMode ? "ESTRATEGIA ACTIVA" : "ACTIVAR AHORA"}<Zap size={13} /></button></section>
          <section className="panel rounded-2xl p-5"><div className="mb-5 flex items-center gap-2 text-xs tracking-[.18em] text-slate-400"><Cpu size={14} />SYSTEM STATUS</div><div className="space-y-4 text-sm"><StatusRow label="Core" value={status} good={sessionReady} /><StatusRow label="Memory" value={system?.memory ? "READY" : "NOT CONFIGURED"} good={Boolean(system?.memory)} /><StatusRow label="Connectors" value={`${connected} ACTIVE`} good={connected > 0} /></div></section>
          <section className="panel rounded-2xl p-5"><div className="mb-4 flex items-center gap-2 text-xs tracking-[.18em] text-slate-400"><BrainCircuit size={14} />MEMORY VAULT</div>{memories.length ? <div className="space-y-3">{memories.slice(0, 4).map((memory) => <article key={memory.id} className="rounded-xl border border-white/6 bg-white/[.025] p-3"><div className="mb-1 text-[10px] uppercase tracking-[.16em] text-cyan-200/70">{memoryLabels[memory.category]} · {Math.round(memory.importance * 100)}%</div><p className="line-clamp-3 text-xs leading-5 text-slate-300">{memory.content}</p></article>)}</div> : <p className="text-xs leading-5 text-slate-500">{system?.memory ? "Aún no hay recuerdos guardados. Puedes pedirle a JARVIS que memorice algo." : "Conecta Supabase para habilitar memoria persistente."}</p>}</section>
        </aside>

        <section className="panel flex min-h-[630px] flex-col rounded-2xl">
          <div className="flex items-start justify-between border-b border-white/7 px-5 py-4"><div><div className="text-xs tracking-[.22em] text-cyan-200/75">{godMode ? "GOD MODE · CHIEF OF STAFF" : "EXECUTIVE COPILOT"}</div><h1 className="mt-1 text-2xl font-medium text-white">{godMode ? "Diseñemos tu siguiente ventaja." : "¿Qué resolvemos hoy?"}</h1></div><div className="hidden rounded-full border border-emerald-300/15 bg-emerald-300/5 px-3 py-1 text-[10px] tracking-[.14em] text-emerald-200 sm:block">SESSION PROTECTED</div></div>
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-6">{messages.length === 0 ? <div className="flex h-full flex-col items-center justify-center text-center"><div className="orb mb-8" aria-label="JARVIS core visualizer" /><p className="max-w-md text-sm leading-6 text-slate-400">{godMode ? "Define una meta ambiciosa. JARVIS la convertirá en decisiones, métricas y un plan que puedas ejecutar hoy." : "Planifica tu día, sintetiza información, conserva contexto y usa herramientas reales cuando estén conectadas."}</p><div className="mt-5 grid w-full max-w-xl gap-2 sm:grid-cols-2">{(godMode ? ["Diseña mi plan de crecimiento para 90 días", "Encuentra el cuello de botella principal", "Prioriza mis decisiones esta semana", "Crea un sistema de ejecución diario"] : ["Resume mis prioridades", "Recuerda mi objetivo", "Estado de integraciones", "Diseña mi plan de la semana"]).map((prompt) => <button key={prompt} onClick={() => setInput(prompt)} className="group flex items-center justify-between rounded-xl border border-cyan-300/15 px-3 py-2.5 text-left text-xs text-cyan-100/80 transition hover:border-cyan-300/40 hover:bg-cyan-300/5"><span>{prompt}</span><ChevronRight size={14} className="text-cyan-200/50 transition group-hover:translate-x-0.5 group-hover:text-cyan-200" /></button>)}</div></div> : messages.map((message, index) => <div key={`${message.role}-${index}`} className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "ml-auto bg-cyan-300/12 text-cyan-50" : "border border-white/6 bg-white/[.035] text-slate-200"}`}>{message.content || "…"}</div>)}</div>
          <form onSubmit={submit} className="flex items-center gap-2 border-t border-white/7 p-3"><input value={input} onChange={(event) => setInput(event.target.value)} disabled={busy || !sessionReady} placeholder={sessionReady ? "Dale una instrucción a JARVIS…" : "Inicializando sesión…"} className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600" /><button type="button" onClick={toggleVoice} aria-label={listening ? "Detener entrada de voz" : "Iniciar entrada de voz"} className={`grid size-11 place-items-center rounded-xl border ${listening ? "border-cyan-300/50 text-cyan-200" : "border-white/8 text-slate-400 hover:border-cyan-300/30 hover:text-cyan-200"}`}><Mic size={18} /></button><button type="submit" disabled={busy || !sessionReady || !input.trim()} className="grid size-11 place-items-center rounded-xl bg-cyan-300 text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"><Send size={17} /></button></form>
        </section>

        <aside className="space-y-5"><section className="panel rounded-2xl p-5"><div className="mb-4 flex items-center gap-2 text-xs tracking-[.18em] text-slate-400"><Target size={14} />CONTROL DE MISIÓN</div><div className="space-y-3"><MissionStep number="01" label="Define el resultado" active /><MissionStep number="02" label="Elige la palanca" active={godMode} /><MissionStep number="03" label="Aprueba la acción" /></div><p className="mt-4 border-t border-white/6 pt-3 text-[10px] leading-4 text-slate-500">Las propuestas no ejecutan acciones externas sin tu aprobación.</p></section><section className="panel rounded-2xl p-5"><div className="mb-4 flex items-center justify-between"><div className="text-xs tracking-[.18em] text-slate-400">CONNECTED TOOLS</div><button onClick={() => void refreshCommandCenter()} aria-label="Actualizar estado" className="text-slate-500 hover:text-cyan-200"><ArrowUpRight size={15} /></button></div><div className="space-y-2">{system?.integrations.map((integration) => { const Icon = iconByIntegration[integration.id] ?? Database; return <div key={integration.id} className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[.02] px-3 py-3"><Icon size={15} className={integration.configured ? "text-emerald-300" : "text-slate-600"} /><div className="min-w-0 flex-1"><div className="text-xs capitalize text-slate-200">{integration.id}</div><div className="mt-0.5 text-[10px] tracking-[.12em] text-slate-500">{integration.mode}</div></div>{integration.configured ? <CheckCircle2 size={14} className="text-emerald-300" /> : <X size={14} className="text-slate-600" />}</div>; }) ?? <p className="text-xs text-slate-500">Comprobando conectores…</p>}</div></section><section className="panel rounded-2xl p-5"><div className="text-xs tracking-[.18em] text-slate-400">LIVE TELEMETRY</div><div className="mt-4 grid grid-cols-2 gap-3"><Metric label="EVENTS" value={String(messageCount)} /><Metric label="MODEL" value={system?.model ?? "…"} /><Metric label="VOICE" value={voiceEnabled ? "READY" : "TEXT"} /><Metric label="ACTIONS" value="APPROVAL" /></div></section></aside>
      </div>
    </section>
  </main>;
}

function StatusRow({ label, value, good }: { label: string; value: string; good: boolean }) { return <div className="flex items-center justify-between gap-2"><span className="text-slate-500">{label}</span><span className={`flex items-center gap-1.5 text-[10px] tracking-[.11em] ${good ? "text-emerald-300" : "text-amber-200"}`}><span className={`size-1.5 rounded-full ${good ? "bg-emerald-300" : "bg-amber-200"}`} />{value}</span></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/6 bg-white/[.02] p-3"><div className="text-[9px] tracking-[.14em] text-slate-500">{label}</div><div className="mt-1 truncate text-xs text-slate-200">{value}</div></div>; }
function MissionStep({ number, label, active = false }: { number: string; label: string; active?: boolean }) { return <div className="flex items-center gap-3"><span className={`grid size-6 place-items-center rounded-full border text-[9px] ${active ? "border-cyan-200/40 bg-cyan-200/10 text-cyan-100" : "border-white/10 text-slate-600"}`}>{number}</span><span className={`text-xs ${active ? "text-slate-200" : "text-slate-500"}`}>{label}</span></div>; }
