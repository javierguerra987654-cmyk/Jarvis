import React from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Wrench,
  Globe,
  Database,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Layers,
  Activity,
} from 'lucide-react';
import { ActionProposal, GroundingSource, BusinessMemoryItem } from '../types.js';

interface ContextualIntelligencePanelProps {
  isOpen: boolean;
  onToggle: () => void;
  currentTask?: string | null;
  activeTools?: string[];
  groundingSources?: GroundingSource[];
  referencedMemories?: BusinessMemoryItem[];
  actionProposals?: ActionProposal[];
  onOpenProposal?: (proposal: ActionProposal) => void;
}

export const ContextualIntelligencePanel: React.FC<ContextualIntelligencePanelProps> = ({
  isOpen,
  onToggle,
  currentTask,
  activeTools = [],
  groundingSources = [],
  referencedMemories = [],
  actionProposals = [],
  onOpenProposal,
}) => {
  const hasContent =
    Boolean(currentTask) ||
    activeTools.length > 0 ||
    groundingSources.length > 0 ||
    referencedMemories.length > 0 ||
    actionProposals.length > 0;

  return (
    <aside
      aria-label="Panel de Inteligencia Contextual"
      className={`relative border-l border-[#16202c] bg-[#0b1016]/95 backdrop-blur-md transition-all duration-300 flex flex-col h-full z-20 shrink-0 select-none ${
        isOpen ? 'w-80 sm:w-88' : 'w-12'
      }`}
    >
      {/* Toggle Tab Button */}
      <button
        onClick={onToggle}
        title={isOpen ? 'Colapsar Panel de Contexto' : 'Expandir Panel de Contexto'}
        aria-expanded={isOpen}
        className="w-full h-14 border-b border-[#16202c] flex items-center justify-between px-3 text-[#8b97a5] hover:text-[#f5f7fa] hover:bg-[#111820] transition-colors"
      >
        {isOpen ? (
          <>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00d5ff]" />
              <span className="text-xs font-mono font-bold tracking-wider text-[#f5f7fa] uppercase">
                CONTEXT INTELLIGENCE
              </span>
            </div>
            <ChevronRight className="w-4 h-4" />
          </>
        ) : (
          <div className="w-full flex flex-col items-center gap-1">
            <ChevronLeft className="w-4 h-4 text-[#00d5ff]" />
            {hasContent && (
              <span className="w-2 h-2 rounded-full bg-[#00d5ff] animate-pulse" />
            )}
          </div>
        )}
      </button>

      {/* Expanded Content Area */}
      {isOpen && (
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs font-sans">
          {/* 1. Current Task */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#8b97a5]">
              <Activity className="w-3.5 h-3.5 text-[#00d5ff]" />
              <span>CURRENT TASK</span>
            </div>
            <div className="bg-[#111820] border border-[#1e2a38] rounded-lg p-3 text-[#f5f7fa] font-medium leading-relaxed shadow-sm">
              {currentTask || 'En espera de solicitud conversacional o comando'}
            </div>
          </div>

          {/* 2. Tools Executed */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#8b97a5]">
              <div className="flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-[#6575ff]" />
                <span>TOOLS ENGAGED</span>
              </div>
              <span className="text-[#00d5ff] font-bold">{activeTools.length}</span>
            </div>

            {activeTools.length > 0 ? (
              <div className="space-y-1.5">
                {activeTools.map((tool, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-[#111820] border border-[#1e2a38] rounded-md px-2.5 py-1.5"
                  >
                    <span className="font-mono text-[11px] text-[#f5f7fa]">{tool}</span>
                    <span className="flex items-center gap-1 text-[10px] text-[#35d07f] font-mono font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      OK
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-[#8b97a5] italic p-2 bg-[#111820]/40 rounded border border-[#16202c]">
                Ninguna herramienta ejecutada en este turno.
              </div>
            )}
          </div>

          {/* 3. Verified Grounding Sources */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#8b97a5]">
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#00d5ff]" />
                <span>VERIFIED SOURCES</span>
              </div>
              <span className="text-[#00d5ff] font-bold">{groundingSources.length}</span>
            </div>

            {groundingSources.length > 0 ? (
              <div className="space-y-1.5">
                {groundingSources.map((src, idx) => (
                  <a
                    key={idx}
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-[#111820] hover:bg-[#162230] border border-[#1e2a38] hover:border-[#00d5ff]/40 rounded-md p-2 transition-all group"
                  >
                    <div className="flex items-center justify-between text-[#00d5ff] font-medium truncate text-[11px]">
                      <span className="truncate">{src.title || 'Web Document'}</span>
                      <ExternalLink className="w-3 h-3 shrink-0 ml-1 opacity-70 group-hover:opacity-100" />
                    </div>
                    <div className="text-[9px] text-[#8b97a5] font-mono truncate mt-0.5">
                      {src.uri}
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-[#8b97a5] italic p-2 bg-[#111820]/40 rounded border border-[#16202c]">
                Sin fuentes externas requeridas.
              </div>
            )}
          </div>

          {/* 4. Business Memory Referenced */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#8b97a5]">
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#35d07f]" />
                <span>ACTIVE MEMORY</span>
              </div>
              <span className="text-[#35d07f] font-bold">{referencedMemories.length}</span>
            </div>

            {referencedMemories.length > 0 ? (
              <div className="space-y-1.5">
                {referencedMemories.map((mem) => (
                  <div
                    key={mem.id}
                    className="bg-[#111820] border border-[#1e2a38] rounded-md p-2.5 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[11px] text-[#f5f7fa] truncate">
                        {mem.title}
                      </span>
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-950/60 text-[#35d07f] border border-emerald-800/40">
                        {mem.category}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#8b97a5] line-clamp-2 leading-relaxed">
                      {mem.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-[#8b97a5] italic p-2 bg-[#111820]/40 rounded border border-[#16202c]">
                Contexto base cargado desde almacenamiento inmutable.
              </div>
            )}
          </div>

          {/* 5. System Action Proposals */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#8b97a5]">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#ffb84d]" />
                <span>PENDING PROPOSALS</span>
              </div>
              <span className="text-[#ffb84d] font-bold">{actionProposals.length}</span>
            </div>

            {actionProposals.length > 0 ? (
              <div className="space-y-2">
                {actionProposals.map((prop) => (
                  <div
                    key={prop.id}
                    className="bg-[#111820] border border-amber-500/30 rounded-lg p-2.5 space-y-2"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-950/60 text-[#ffb84d] border border-amber-800/50">
                          {prop.risk} RISK
                        </span>
                        <span className="font-semibold text-[11px] text-[#f5f7fa] truncate">
                          {prop.title}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#8b97a5] mt-1 line-clamp-2">
                        {prop.reason}
                      </p>
                    </div>

                    {onOpenProposal && (
                      <button
                        onClick={() => onOpenProposal(prop)}
                        className="w-full py-1 rounded bg-[#ffb84d] hover:bg-amber-400 text-[#05070a] font-bold text-[10px] uppercase tracking-wide transition-colors"
                      >
                        Revisar Acción
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-[#8b97a5] italic p-2 bg-[#111820]/40 rounded border border-[#16202c]">
                Ninguna propuesta pendiente de aprobación.
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
