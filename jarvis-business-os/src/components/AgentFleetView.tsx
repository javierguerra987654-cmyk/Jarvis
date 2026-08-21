import React, { useState } from 'react';
import {
  Bot,
  Cpu,
  Globe,
  TrendingUp,
  Megaphone,
  Target,
  Package,
  Zap,
  Compass,
  ShieldCheck,
  Play,
  CheckCircle2,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { AgentInfo, AgentRole } from '../types.js';

interface AgentFleetViewProps {
  agents: AgentInfo[];
  onRunAgentPrompt: (agentRole: AgentRole, prompt: string) => Promise<void>;
  isExecuting: boolean;
}

export const AgentFleetView: React.FC<AgentFleetViewProps> = ({
  agents,
  onRunAgentPrompt,
  isExecuting,
}) => {
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(agents[0] || null);
  const [customPrompt, setCustomPrompt] = useState('');

  const getAgentIcon = (role: string) => {
    switch (role) {
      case 'CORE':
        return Cpu;
      case 'MARKET_INTELLIGENCE':
        return Globe;
      case 'SALES':
        return TrendingUp;
      case 'MARKETING':
        return Megaphone;
      case 'CRO':
        return Target;
      case 'PRODUCT':
        return Package;
      case 'AUTOMATION':
        return Zap;
      case 'RESEARCH':
        return Compass;
      case 'EXECUTION':
        return ShieldCheck;
      default:
        return Bot;
    }
  };

  const handleRunAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent || !customPrompt.trim() || isExecuting) return;
    const prompt = `[Para ${selectedAgent.name}] ${customPrompt}`;
    setCustomPrompt('');
    await onRunAgentPrompt(selectedAgent.role, prompt);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-[#10141f] border border-[#1e2538] rounded-xl p-6 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
              MULTI-AGENT SPECIALIZED SYSTEM
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            Flota de Agentes Inteligentes
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            JARVIS CORE delega análisis complejos y tareas específicas en agentes especializados con acceso a herramientas, búsqueda web y base de memoria corporativa.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#0b0e15] border border-[#1e2538] px-4 py-3 rounded-lg">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="text-xs font-mono text-slate-300 font-semibold">
            {agents.length} Agentes Operativos
          </span>
        </div>
      </div>

      {/* Main Layout: Agent Grid & Interactive Agent Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Agent Cards (2 Cols) */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent) => {
            const Icon = getAgentIcon(agent.role);
            const isSelected = selectedAgent?.role === agent.role;

            return (
              <div
                key={agent.role}
                id={`agent_card_${agent.role.toLowerCase()}`}
                onClick={() => setSelectedAgent(agent)}
                className={`p-5 rounded-xl border transition-all cursor-pointer space-y-3 ${
                  isSelected
                    ? 'bg-[#131929] border-cyan-500/60 shadow-xl shadow-cyan-950/40'
                    : 'bg-[#0f131d] border-[#1e2538] hover:border-[#2a354c]'
                }`}
              >
                {/* Agent Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center border shadow-md"
                      style={{
                        backgroundColor: `${agent.color}15`,
                        borderColor: `${agent.color}40`,
                        color: agent.color,
                      }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wide">
                        {agent.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {agent.title}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> {agent.status}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 leading-relaxed">
                  {agent.description}
                </p>

                {/* Capabilities */}
                <div className="space-y-1 pt-1">
                  <div className="text-[10px] font-mono uppercase text-slate-500 font-semibold">
                    Capacidades Especializadas:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {agent.capabilities.map((cap, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#090c13] border border-[#1e2538] text-slate-300"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Tools */}
                <div className="pt-2 border-t border-[#1e2538] flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>Herramientas: {agent.tools.length}</span>
                  <span className="text-cyan-400 group-hover:underline">Inspeccionar →</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Selected Agent Deep Terminal */}
        <div className="space-y-4">
          {selectedAgent ? (
            <div className="bg-[#10141f] border border-[#1e2538] rounded-xl p-5 space-y-5 sticky top-20 shadow-xl shadow-black/30">
              <div className="flex items-center gap-3 border-b border-[#1e2538] pb-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center border shadow-md"
                  style={{
                    backgroundColor: `${selectedAgent.color}15`,
                    borderColor: `${selectedAgent.color}40`,
                    color: selectedAgent.color,
                  }}
                >
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                    {selectedAgent.name}
                  </h3>
                  <p className="text-xs font-mono text-cyan-400">
                    Terminal & Herramientas
                  </p>
                </div>
              </div>

              {/* Tools Inventory */}
              <div className="space-y-2">
                <div className="text-xs font-mono font-bold text-slate-300 uppercase">
                  Herramientas Conectadas ({selectedAgent.tools.length})
                </div>
                <div className="space-y-1.5">
                  {selectedAgent.tools.map((tool, idx) => (
                    <div
                      key={idx}
                      className="bg-[#090c13] border border-[#1e2538] px-3 py-2 rounded-lg flex items-center justify-between text-xs font-mono text-slate-300"
                    >
                      <code className="text-cyan-300">{tool}</code>
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> LISTA
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Direct Agent Command Prompt */}
              <div className="space-y-2 pt-2 border-t border-[#1e2538]">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-300 uppercase">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>Delegar Tarea a {selectedAgent.name}</span>
                </div>
                <form onSubmit={handleRunAgent} className="space-y-2">
                  <textarea
                    id="agent_direct_prompt_input"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={3}
                    placeholder={`Indica la instrucción directa para ${selectedAgent.name}...`}
                    disabled={isExecuting}
                    className="w-full bg-[#090c13] border border-[#1e2538] rounded-lg p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none font-sans"
                  />
                  <button
                    id="btn_run_direct_agent"
                    type="submit"
                    disabled={isExecuting || !customPrompt.trim()}
                    className="w-full py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-semibold transition-colors disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{isExecuting ? 'Ejecutando...' : `Lanzar ${selectedAgent.name}`}</span>
                  </button>
                </form>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
