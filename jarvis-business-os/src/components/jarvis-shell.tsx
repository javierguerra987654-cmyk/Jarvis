"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { Activity, Cpu, Send, ShieldCheck, Sparkles, Volume2 } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

export function JarvisShell() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const status = busy ? "THINKING" : "ONLINE";
  const messageCount = useMemo(() => messages.length, [messages.length]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    const nextHistory = [...messages, { role: "user" as const, content: text }];
    setMessages(nextHistory);
    setInput("");
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/jarvis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: messages.slice(-20) }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "No se pudo conectar con JARVIS.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistant = "";
      setMessages((current) => [...current, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          const parsed = JSON.parse(data);
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.delta) {
            assistant += parsed.delta;
            setMessages((current) => {
              const copy = [...current];
              copy[copy.length - 1] = { role: "assistant", content: assistant };
              return copy;
            });
          }
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      const message = error instanceof Error ? error.message : "Error desconocido.";
      setMessages((current) => [...current, { role: "assistant", content: `Sistema: ${message}` }]);
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-6 md:px-8">
      <div className="hud-grid pointer-events-none absolute inset-0" />

      <section className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col">
        <header className="flex items-center justify-between border-b border-white/8 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/5 text-cyan-200">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-[0.28em] text-white">J.A.R.V.I.S.</div>
              <div className="text-[10px] tracking-[0.2em] text-slate-500">CORE INTELLIGENCE / 2026</div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] tracking-[0.15em] text-slate-400">
            <span className="flex items-center gap-2"><Activity size={13} /> {status}</span>
            <span className="hidden items-center gap-2 sm:flex"><ShieldCheck size={13} /> PRIVATE CORE</span>
          </div>
        </header>

        <div className="grid flex-1 gap-6 py-8 lg:grid-cols-[260px_minmax(0,1fr)_260px]">
          <aside className="panel hidden rounded-2xl p-5 lg:block">
            <div className="mb-6 flex items-center gap-2 text-xs tracking-[0.2em] text-slate-400"><Cpu size={14} /> SYSTEM</div>
            <div className="space-y-3 text-sm">
              {["Reasoning Core", "Context Engine", "Tool Router", "Memory Layer"].map((item) => (
                <div key={item} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-3 text-slate-300">
                  <span>{item}</span><span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_#5af1b8]" />
                </div>
              ))}
            </div>
          </aside>

          <section className="flex min-h-[62vh] flex-col items-center justify-center">
            <div className="orb mb-10" aria-label="JARVIS core visualizer" />
            <div className="mb-2 text-xs tracking-[0.35em] text-cyan-200/70">{status}</div>
            <h1 className="text-center text-3xl font-medium tracking-tight text-white md:text-5xl">At your service, Señor.</h1>
            <p className="mt-3 max-w-xl text-center text-sm leading-6 text-slate-500">The new JARVIS core is online. Text streaming is active; voice, memory and tools are modular extensions.</p>

            <div className="panel mt-8 flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl">
              <div className="max-h-72 min-h-28 overflow-y-auto p-4 text-sm">
                {messages.length === 0 ? (
                  <div className="flex h-24 items-center justify-center text-slate-600">Esperando instrucciones.</div>
                ) : (
                  messages.map((message, index) => (
                    <div key={`${message.role}-${index}`} className={`mb-3 max-w-[88%] rounded-2xl px-4 py-3 ${message.role === "user" ? "ml-auto bg-cyan-300/10 text-cyan-50" : "bg-white/[0.035] text-slate-200"}`}>
                      {message.content || "…"}
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={submit} className="flex items-center gap-2 border-t border-white/7 p-3">
                <input value={input} onChange={(event) => setInput(event.target.value)} disabled={busy} placeholder="Escriba una instrucción…" className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600" />
                <button type="button" aria-label="Voice module" className="grid size-11 place-items-center rounded-xl border border-white/8 text-slate-400 hover:border-cyan-300/30 hover:text-cyan-200"><Volume2 size={18} /></button>
                <button type="submit" disabled={busy || !input.trim()} className="grid size-11 place-items-center rounded-xl bg-cyan-300 text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"><Send size={17} /></button>
              </form>
            </div>
          </section>

          <aside className="panel hidden rounded-2xl p-5 lg:block">
            <div className="mb-6 text-xs tracking-[0.2em] text-slate-400">TELEMETRY</div>
            <div className="space-y-5 text-xs">
              <div><div className="text-slate-500">CORE STATE</div><div className="mt-1 text-lg text-emerald-300">{status}</div></div>
              <div><div className="text-slate-500">CONVERSATION EVENTS</div><div className="mt-1 text-lg text-white">{messageCount}</div></div>
              <div><div className="text-slate-500">MODEL</div><div className="mt-1 break-all text-slate-300">gpt-5.6</div></div>
              <div><div className="text-slate-500">TRANSPORT</div><div className="mt-1 text-slate-300">Server streaming</div></div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
