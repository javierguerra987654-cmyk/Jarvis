import React, { useState } from 'react';
import {
  Send,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Search,
  ExternalLink,
  Layers,
  Database,
  Cpu,
  Clock,
  ChevronDown,
  ChevronUp,
  Activity,
  Globe,
  Radio,
} from 'lucide-react';
import {
  ActionProposal,
  CommandExecutionResult,
  Opportunity,
  SystemState,
} from '../types.js';
import { formatCurrency, formatDate } from '../lib/utils.js';

interface CommandCenterViewProps {
  systemState: SystemState | null;
  opportunities: Opportunity[];
  proposals: ActionProposal[];
  lastResult: CommandExecutionResult | null;
  onExecuteCommand: (command: string) => Promise<void>;
  onAnalyzeOpportunity: (id: string) => Promise<void>;
  onPrepareAction: (id: string) => Promise<void>;
  onApproveProposal: (id: string) => Promise<void>;
  onRejectProposal: (id: string) => Promise<void>;
  isExecuting: boolean;
  onNavigateToView: (view: string) => void;
}

export const CommandCenterView: React.FC<CommandCenterViewProps> = ({
  systemState,
  opportunities,
  proposals,
  lastResult,
  onExecuteCommand,
  onAnalyzeOpportunity,
  onPrepareAction,
  onApproveProposal,
  onRejectProposal,
  isExecuting,
  onNavigateToView,
}) => {
  const [commandInput, setCommandInput] = useState('');
  const [showFullPlan, setShowFullPlan] = useState(true);

  const quickPrompts = [
    'Analiza mi negocio a fondo y detecta cuellos de botella.',
    'Encuentra oportunidades de ventas en leads estancados.',
    'Investiga competidores y cambios de precios con Google Search.',
    'Detecta problemas de conversión y UX en móvil.',
    'Encuentra tareas repetitivas que pueda automatizar hoy.',
    'Analiza mis métricas de CAC, LTV y unit economics.',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim() || isExecuting) return;
    const cmd = commandInput;
    setCommandInput('');
    await onExecuteCommand(cmd);
  };

  const pendingProposals = proposals.filter((p) => p.status === 'PROPOSED');
  const recentOpportunities = opportunities.slice(0, 4);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Main Autonomous Command Bar */}
      <div className="bg-[#0b1016] border border-[#16202c] rounded-xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00d5ff] animate-pulse" />
            <span className="text-xs font-mono font-bold tracking-wider text-[#00d5ff] uppercase">
              JARVIS Autonomous Command Line
            </span>
          </div>
          <span className="text-xs font-mono text-[#8b97a5]">
            Modo:{' '}
            <strong className="text-[#f5f7fa]">
              {systemState?.autonomyLevel || 'LOW'}
            </strong>{' '}
            | Gemini 3.7 + Search
          </span>
        </div>

        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-center bg-[#05070a] border border-[#1e2a38] rounded-xl overflow-hidden focus-within:border-[#00d5ff] focus-within:ring-1 focus-within:ring-[#00d5ff]/30 transition-all">
            <div className="pl-4 pr-2 text-[#00d5ff]">
              <Cpu className="w-5 h-5" />
            </div>
            <input
              id="jarvis_main_command_input"
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="¿Qué quieres que haga JARVIS? (Ej: 'Analiza mi negocio', 'Investiga competidores')..."
              disabled={isExecuting}
              className="w-full bg-transparent py-3.5 px-2 text-sm text-[#f5f7fa] placeholder-[#8b97a5] focus:outline-none disabled:opacity-50 font-sans"
            />
            <div className="pr-3">
              <button
                id="btn_send_jarvis_command"
                type="submit"
                disabled={isExecuting || !commandInput.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#00d5ff] hover:bg-cyan-300 text-[#05070a] text-xs font-bold tracking-wide transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isExecuting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-[#05070a]/30 border-t-[#05070a] rounded-full animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <span>Ejecutar</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Quick prompt tags */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono text-[#8b97a5] flex items-center gap-1 mr-1">
            <Sparkles className="w-3 h-3 text-[#00d5ff]" /> Atajos Rápidos:
          </span>
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              id={`quick_prompt_${idx}`}
              onClick={() => onExecuteCommand(prompt)}
              disabled={isExecuting}
              className="text-xs px-2.5 py-1 rounded-md bg-[#111820] border border-[#1e2a38] hover:border-[#00d5ff]/40 text-[#8b97a5] hover:text-[#f5f7fa] transition-all font-sans text-left disabled:opacity-50 cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Live Execution Inspector (When a command ran) */}
      {lastResult && (
        <div className="bg-[#0b1016] border border-[#00d5ff]/30 rounded-xl p-5 sm:p-6 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#16202c] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#00d5ff]/15 text-[#00d5ff] border border-[#00d5ff]/30 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#00d5ff] font-bold uppercase tracking-wider">
                    EJECUCIÓN COMPLETADA
                  </span>
                  <span className="text-[10px] text-[#8b97a5] font-mono">
                    ({lastResult.executionTimeMs}ms)
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-[#f5f7fa] mt-0.5">
                  &ldquo;{lastResult.command}&rdquo;
                </h3>
              </div>
            </div>
            <button
              id="btn_toggle_plan_view"
              onClick={() => setShowFullPlan(!showFullPlan)}
              className="text-xs font-mono text-[#8b97a5] hover:text-[#00d5ff] flex items-center gap-1 cursor-pointer"
            >
              {showFullPlan ? 'Ocultar Desglose' : 'Ver Desglose'}
              {showFullPlan ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showFullPlan && (
            <>
              {/* Step by Step Plan Flow */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-[#8b97a5] uppercase">
                  <span>1. Plan Táctico & Herramientas Ejecutadas</span>
                  <span className="text-[#00d5ff]">Flota Multi-Agente</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {lastResult.plan.map((step) => (
                    <div
                      key={step.stepNumber}
                      className="bg-[#111820] border border-[#1e2a38] rounded-lg p-3 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/80 text-[#00d5ff] border border-cyan-800 font-bold">
                          PASO {step.stepNumber}
                        </span>
                        <span className="text-[10px] font-mono text-[#35d07f] font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> {step.assignedAgent}
                        </span>
                      </div>
                      <p className="text-xs text-[#f5f7fa] font-medium leading-relaxed">
                        {step.description}
                      </p>
                      <div className="text-[10px] font-mono text-[#8b97a5]">
                        Tool: <code className="text-[#00d5ff]">{step.tool}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Gathered & Facts vs Estimations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Facts Verified */}
                <div className="bg-[#111820] border border-emerald-900/40 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#35d07f] uppercase">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Hechos Verificados (Datos & Memoria)</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-[#f5f7fa]">
                    {lastResult.factsVsEstimations.facts.map((fact, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#35d07f] font-bold">•</span>
                        <span>{fact}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Estimations & Projections */}
                <div className="bg-[#111820] border border-amber-900/40 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#ffb84d] uppercase">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Estimaciones & Proyecciones</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-[#8b97a5]">
                    {lastResult.factsVsEstimations.estimations.map((est, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#ffb84d] font-bold">•</span>
                        <span>{est}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Executive Analysis & Conclusions */}
              <div className="bg-[#111820] border border-[#1e2a38] rounded-lg p-4 space-y-3">
                <div className="text-xs font-mono font-bold text-[#00d5ff] uppercase tracking-wider">
                  2. Análisis Estratégico & Síntesis de JARVIS
                </div>
                <p className="text-xs text-[#f5f7fa] leading-relaxed">
                  {lastResult.analysis}
                </p>
                <div className="pt-2 border-t border-[#16202c] space-y-1">
                  <div className="text-[11px] font-mono text-[#8b97a5] uppercase font-semibold">
                    Conclusiones Clave:
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {lastResult.conclusions.map((conc, i) => (
                      <div
                        key={i}
                        className="bg-[#0b1016] border border-[#16202c] p-2.5 rounded text-xs text-[#f5f7fa] flex items-start gap-2"
                      >
                        <span className="text-[#00d5ff] font-bold">{i + 1}.</span>
                        <span>{conc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Google Search Grounding Sources */}
              {lastResult.groundingSources && lastResult.groundingSources.length > 0 && (
                <div className="bg-[#111820] border border-[#1e2a38] rounded-lg p-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono text-[#8b97a5] flex items-center gap-1 mr-2">
                    <Search className="w-3.5 h-3.5 text-[#00d5ff]" /> Fuentes de Grounding:
                  </span>
                  {lastResult.groundingSources.map((source, i) => (
                    <a
                      key={i}
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded bg-[#0b1016] border border-[#1e2a38] text-[#00d5ff] hover:text-cyan-200 hover:border-[#00d5ff]/50 transition-colors"
                    >
                      <span className="truncate max-w-[200px]">{source.title}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 3. Core Business Telemetry */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-[#0b1016] border border-[#16202c] rounded-xl p-4 space-y-1">
          <div className="text-[11px] font-mono text-[#8b97a5] uppercase">Monthly RR</div>
          <div className="text-xl font-bold text-[#f5f7fa] font-mono">
            {formatCurrency(systemState?.metrics.mrr || 84500)}
          </div>
          <div className="text-[11px] font-mono text-[#35d07f] flex items-center gap-1 font-semibold">
            <TrendingUp className="w-3 h-3" /> +{systemState?.metrics.revenueGrowthPct || 14.2}% MoM
          </div>
        </div>

        <div className="bg-[#0b1016] border border-[#16202c] rounded-xl p-4 space-y-1">
          <div className="text-[11px] font-mono text-[#8b97a5] uppercase">Leads Activos</div>
          <div className="text-xl font-bold text-[#f5f7fa] font-mono">
            {systemState?.metrics.activeLeads || 418}
          </div>
          <div className="text-[11px] font-mono text-[#00d5ff]">142 estancados post-demo</div>
        </div>

        <div className="bg-[#0b1016] border border-[#16202c] rounded-xl p-4 space-y-1">
          <div className="text-[11px] font-mono text-[#8b97a5] uppercase">Conversión Web</div>
          <div className="text-xl font-bold text-[#f5f7fa] font-mono">
            {systemState?.metrics.conversionRate || 3.42}%
          </div>
          <div className="text-[11px] font-mono text-[#ffb84d]">Fricción en móvil (-34%)</div>
        </div>

        <div className="bg-[#0b1016] border border-[#16202c] rounded-xl p-4 space-y-1">
          <div className="text-[11px] font-mono text-[#8b97a5] uppercase">Ratio LTV : CAC</div>
          <div className="text-xl font-bold text-[#f5f7fa] font-mono">
            {((systemState?.metrics.ltv || 4850) / (systemState?.metrics.cac || 420)).toFixed(1)}x
          </div>
          <div className="text-[11px] font-mono text-[#35d07f]">CAC: ${systemState?.metrics.cac || 420}</div>
        </div>

        <div className="bg-[#0b1016] border border-[#16202c] rounded-xl p-4 space-y-1">
          <div className="text-[11px] font-mono text-[#8b97a5] uppercase">Horas Ahorradas</div>
          <div className="text-xl font-bold text-[#00d5ff] font-mono">
            {systemState?.metrics.automatedHoursSaved || 86.5}h
          </div>
          <div className="text-[11px] font-mono text-[#8b97a5]">Por automatizaciones</div>
        </div>

        <div className="bg-[#0b1016] border border-[#16202c] rounded-xl p-4 space-y-1">
          <div className="text-[11px] font-mono text-[#8b97a5] uppercase">Salud Operativa</div>
          <div className="text-xl font-bold text-[#35d07f] font-mono">
            {systemState?.metrics.healthScore || 96.8}%
          </div>
          <div className="text-[11px] font-mono text-[#8b97a5]">0 alertas críticas</div>
        </div>
      </div>

      {/* 4. Two-Column Operational Hub: Priority Action Approvals & Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Approvals Awaiting Human Authorization */}
        <div className="bg-[#0b1016] border border-[#16202c] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#16202c] pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#ffb84d]" />
              <h3 className="text-xs font-mono font-bold text-[#f5f7fa] uppercase tracking-wider">
                Propuestas de Acción Pendientes ({pendingProposals.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigateToView('action_proposals')}
              className="text-xs text-[#00d5ff] hover:text-cyan-300 font-mono flex items-center gap-1 cursor-pointer"
            >
              Ver todas <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {pendingProposals.length === 0 ? (
            <div className="p-8 text-center text-[#8b97a5] font-mono text-xs border border-dashed border-[#16202c] rounded-lg">
              No hay acciones críticas esperando aprobación. El sistema opera dentro de los límites de autonomía.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingProposals.slice(0, 3).map((prop) => (
                <div
                  key={prop.id}
                  id={`home_proposal_${prop.id}`}
                  className="bg-[#111820] border border-[#1e2a38] hover:border-[#00d5ff]/30 rounded-lg p-4 space-y-3 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                            prop.risk === 'HIGH' || prop.risk === 'CRITICAL'
                              ? 'bg-rose-950 text-[#ff5c70] border border-rose-800'
                              : prop.risk === 'MEDIUM'
                              ? 'bg-amber-950 text-[#ffb84d] border border-amber-800'
                              : 'bg-emerald-950 text-[#35d07f] border border-emerald-800'
                          }`}
                        >
                          RIESGO {prop.risk}
                        </span>
                        <span className="text-[10px] font-mono text-[#00d5ff]">
                          {prop.agent}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-[#f5f7fa] mt-1">
                        {prop.title}
                      </h4>
                    </div>
                    <span className="text-xs font-mono font-semibold text-[#35d07f] shrink-0">
                      {prop.estimatedImpact}
                    </span>
                  </div>

                  <p className="text-xs text-[#8b97a5] line-clamp-2">
                    {prop.reason}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-[#16202c]">
                    <span className="text-[10px] font-mono text-[#8b97a5]">
                      Tipo: {prop.actionType}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        id={`btn_reject_prop_${prop.id}`}
                        onClick={() => onRejectProposal(prop.id)}
                        className="px-3 py-1 text-xs font-mono text-[#8b97a5] hover:text-[#ff5c70] hover:bg-rose-950/30 rounded border border-transparent hover:border-rose-900/50 transition-colors cursor-pointer"
                      >
                        Rechazar
                      </button>
                      <button
                        id={`btn_approve_prop_${prop.id}`}
                        onClick={() => onApproveProposal(prop.id)}
                        className="px-3 py-1 text-xs font-mono font-semibold bg-[#35d07f] hover:bg-emerald-400 text-[#05070a] rounded shadow-sm transition-all cursor-pointer font-bold"
                      >
                        Aprobar & Ejecutar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Opportunities Radar Section */}
        <div className="bg-[#0b1016] border border-[#16202c] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#16202c] pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00d5ff]" />
              <h3 className="text-xs font-mono font-bold text-[#f5f7fa] uppercase tracking-wider">
                Radar de Oportunidades ({opportunities.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigateToView('opportunities')}
              className="text-xs text-[#00d5ff] hover:text-cyan-300 font-mono flex items-center gap-1 cursor-pointer"
            >
              Ver Radar Completo <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {recentOpportunities.map((opp) => (
              <div
                key={opp.id}
                id={`home_opp_${opp.id}`}
                className="bg-[#111820] border border-[#1e2a38] hover:border-[#00d5ff]/30 rounded-lg p-4 space-y-2.5 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-cyan-950 text-[#00d5ff] border border-cyan-800 font-bold">
                        {opp.category}
                      </span>
                      <span className="text-[10px] font-mono text-[#8b97a5]">
                        Confianza: <strong className="text-[#f5f7fa]">{opp.confidence}%</strong>
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-[#f5f7fa] mt-1">
                      {opp.title}
                    </h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#00d5ff] shrink-0">
                    {opp.estimatedImpact}
                  </span>
                </div>

                <p className="text-xs text-[#8b97a5] line-clamp-2">
                  {opp.reason}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-[#16202c]">
                  <span className="text-[10px] font-mono text-[#8b97a5]">
                    Agente: {opp.assignedAgent}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      id={`btn_analyze_opp_${opp.id}`}
                      onClick={() => onAnalyzeOpportunity(opp.id)}
                      className="px-2.5 py-1 text-[11px] font-mono text-[#00d5ff] hover:bg-cyan-950/40 rounded border border-cyan-800 transition-colors cursor-pointer"
                    >
                      Analizar
                    </button>
                    <button
                      id={`btn_prep_action_${opp.id}`}
                      onClick={() => onPrepareAction(opp.id)}
                      className="px-2.5 py-1 text-[11px] font-mono font-semibold bg-[#00d5ff] hover:bg-cyan-300 text-[#05070a] rounded transition-colors cursor-pointer font-bold"
                    >
                      Preparar Acción
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
