import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Code2,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';
import { ActionProposal, RiskLevel } from '../types.js';
import { formatDate } from '../lib/utils.js';
import { DataSourceBadge } from './DataSourceBadge.js';

interface ActionProposalsViewProps {
  proposals: ActionProposal[];
  onApproveProposal: (id: string) => Promise<void>;
  onRejectProposal: (id: string) => Promise<void>;
  onExecuteProposal: (id: string) => Promise<void>;
  isProcessing: boolean;
}

export const ActionProposalsView: React.FC<ActionProposalsViewProps> = ({
  proposals,
  onApproveProposal,
  onRejectProposal,
  onExecuteProposal,
  isProcessing,
}) => {
  const [selectedTab, setSelectedTab] = useState<'PENDING' | 'EXECUTED' | 'ALL'>('PENDING');
  const [expandedPayloadId, setExpandedPayloadId] = useState<string | null>(null);

  const pendingProposals = proposals.filter((p) => p.status === 'PROPOSED');
  const executedProposals = proposals.filter((p) => p.status === 'COMPLETED' || p.status === 'APPROVED');

  const displayedProposals =
    selectedTab === 'PENDING'
      ? pendingProposals
      : selectedTab === 'EXECUTED'
      ? executedProposals
      : proposals;

  return (
    <div className="space-y-6 pb-12">
      {/* Governance & Permission Levels Header */}
      <div className="bg-[#10141f] border border-[#1e2538] rounded-xl p-6 relative overflow-hidden space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> HITL GOVERNANCE & ACTION PROPOSALS
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-100 mt-1">
              Gobernanza Operativa & Permisos
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              JARVIS opera bajo una estricta política de permisos de 3 niveles. Las acciones que implican modificaciones en precios, envíos masivos, presupuestos o configuraciones requieren autorización explícita antes de su ejecución.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-[#0b0e15] border border-emerald-900/40 px-3 py-2 rounded-lg text-center">
              <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold block">1. READ</span>
              <span className="text-[10px] text-slate-400 font-mono">Autónomo</span>
            </div>
            <div className="bg-[#0b0e15] border border-cyan-900/40 px-3 py-2 rounded-lg text-center">
              <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold block">2. ANALYZE</span>
              <span className="text-[10px] text-slate-400 font-mono">Autónomo</span>
            </div>
            <div className="bg-[#0b0e15] border border-amber-900/40 px-3 py-2 rounded-lg text-center">
              <span className="text-[10px] font-mono text-amber-400 uppercase font-bold block">3. EXECUTE</span>
              <span className="text-[10px] text-amber-300 font-mono font-semibold">Gobernado HITL</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-[#1e2538] pb-3">
        <div className="flex items-center gap-2">
          <button
            id="tab_pending_proposals"
            onClick={() => setSelectedTab('PENDING')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all ${
              selectedTab === 'PENDING'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pendientes de Aprobación ({pendingProposals.length})
          </button>
          <button
            id="tab_executed_proposals"
            onClick={() => setSelectedTab('EXECUTED')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all ${
              selectedTab === 'EXECUTED'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Aprobadas & Ejecutadas ({executedProposals.length})
          </button>
          <button
            id="tab_all_proposals"
            onClick={() => setSelectedTab('ALL')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all ${
              selectedTab === 'ALL'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Historial Completo ({proposals.length})
          </button>
        </div>
      </div>

      {/* Proposals List */}
      <div className="space-y-4">
        {displayedProposals.length === 0 ? (
          <div className="bg-[#0f131d] border border-dashed border-[#1e2538] rounded-xl p-12 text-center text-slate-500 font-mono text-xs">
            No hay propuestas de acción en esta categoría.
          </div>
        ) : (
          displayedProposals.map((prop) => {
            const isExpanded = expandedPayloadId === prop.id;
            const isPending = prop.status === 'PROPOSED';
            const isApproved = prop.status === 'APPROVED';
            const isCompleted = prop.status === 'COMPLETED';
            const isRejected = prop.status === 'REJECTED';

            return (
              <div
                key={prop.id}
                id={`proposal_card_${prop.id}`}
                className="bg-[#0f131d] border border-[#1e2538] hover:border-[#2a344d] rounded-xl p-5 space-y-4 shadow-lg shadow-black/20 transition-all"
              >
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      {/* Risk Badge */}
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                          prop.risk === 'CRITICAL' || prop.risk === 'HIGH'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : prop.risk === 'MEDIUM'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        }`}
                      >
                        RIESGO {prop.risk}
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                          isPending
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-800 animate-pulse'
                            : isCompleted
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : isApproved
                            ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}
                      >
                        ESTADO: {prop.status}
                      </span>

                      <span className="text-[10px] font-mono text-slate-400">
                        Agente: <strong className="text-slate-300">{prop.agent}</strong>
                      </span>
                      <DataSourceBadge source={prop.dataSource || 'REAL'} />
                    </div>

                    <h3 className="text-sm font-bold text-slate-100">
                      {prop.title}
                    </h3>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-emerald-400 block">
                      {prop.estimatedImpact}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Propuesto: {formatDate(prop.proposedAt)}
                    </span>
                  </div>
                </div>

                {/* Reason */}
                <div className="bg-[#0b0e15] border border-[#1e2538] p-3 rounded-lg space-y-1">
                  <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
                    Motivo & Justificación de la IA:
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {prop.reason}
                  </p>
                </div>

                {/* Data & Evidence backing */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
                    Evidencia & Datos Utilizados:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {prop.dataEvidence.map((ev, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#151c2b] border border-[#222a3d] text-slate-300"
                      >
                        {ev}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Execution Output (if completed) */}
                {prop.executionOutput && (
                  <div className="bg-[#0b1310] border border-emerald-900/50 p-3 rounded-lg space-y-1">
                    <div className="text-[10px] font-mono uppercase text-emerald-400 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Resultado de Ejecución:
                    </div>
                    <p className="text-xs text-emerald-200 font-mono">
                      {prop.executionOutput}
                    </p>
                  </div>
                )}

                {/* Payload toggle & Inspector */}
                <div>
                  <button
                    onClick={() => setExpandedPayloadId(isExpanded ? null : prop.id)}
                    className="text-xs font-mono text-slate-400 hover:text-cyan-400 flex items-center gap-1"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>{isExpanded ? 'Ocultar Parámetros de Acción' : 'Ver Parámetros / Payload JSON'}</span>
                  </button>
                  {isExpanded && (
                    <pre className="mt-2 p-3 bg-[#080a0f] border border-[#1e2538] rounded-lg text-[11px] font-mono text-cyan-300 overflow-x-auto">
                      {JSON.stringify(prop.payload, null, 2)}
                    </pre>
                  )}
                </div>

                {/* Governance Action Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-[#1e2538]">
                  <div className="text-[10px] font-mono text-slate-400">
                    Tipo de Acción: <code className="text-cyan-400">{prop.actionType}</code>
                  </div>

                  <div className="flex items-center gap-2">
                    {isPending && (
                      <>
                        <button
                          id={`btn_reject_${prop.id}`}
                          onClick={() => onRejectProposal(prop.id)}
                          disabled={isProcessing}
                          className="px-3.5 py-1.5 text-xs font-mono text-slate-300 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg border border-[#222a3d] hover:border-rose-900/50 transition-colors disabled:opacity-50"
                        >
                          Rechazar
                        </button>
                        <button
                          id={`btn_approve_${prop.id}`}
                          onClick={() => onApproveProposal(prop.id)}
                          disabled={isProcessing}
                          className="px-4 py-1.5 text-xs font-mono font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg shadow-md shadow-emerald-950 transition-all disabled:opacity-50 cursor-pointer"
                        >
                          Aprobar & Ejecutar
                        </button>
                      </>
                    )}

                    {isApproved && (
                      <button
                        id={`btn_execute_${prop.id}`}
                        onClick={() => onExecuteProposal(prop.id)}
                        disabled={isProcessing}
                        className="px-4 py-1.5 text-xs font-mono font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Ejecutar Ahora</span>
                      </button>
                    )}

                    {isCompleted && (
                      <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-4 h-4" /> Ejecutado y Auditado
                      </span>
                    )}

                    {isRejected && (
                      <span className="text-xs font-mono text-rose-400 flex items-center gap-1 font-semibold">
                        <XCircle className="w-4 h-4" /> Rechazado por Operador
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
