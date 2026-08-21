import React, { useState } from 'react';
import {
  Activity,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Download,
  Code2,
} from 'lucide-react';
import { AuditLogEntry } from '../types.js';
import { formatDate } from '../lib/utils.js';

interface ActivityAuditViewProps {
  logs: AuditLogEntry[];
  isLoading: boolean;
}

export const ActivityAuditView: React.FC<ActivityAuditViewProps> = ({
  logs,
  isLoading,
}) => {
  const [selectedAgent, setSelectedAgent] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const filteredLogs = logs.filter((log) => {
    const matchesAgent = selectedAgent === 'ALL' || log.agent === selectedAgent;
    const matchesStatus = selectedStatus === 'ALL' || log.status === selectedStatus;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      log.action.toLowerCase().includes(q) ||
      log.tool.toLowerCase().includes(q) ||
      log.user.toLowerCase().includes(q) ||
      (typeof log.result === 'string' && log.result.toLowerCase().includes(q));
    return matchesAgent && matchesStatus && matchesSearch;
  });

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `JARVIS_Audit_Log_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-[#10141f] border border-[#1e2538] rounded-xl p-6 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4" /> IMMUTABLE AUDIT TRAIL
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            Registro de Auditoría & Trazabilidad
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Cada observación, invocación de herramientas, propuesta formulada, aprobación de usuario y ejecución queda registrada de forma inmutable con timestamps, parámetros de entrada y telemetría de latencia.
          </p>
        </div>

        <button
          id="btn_export_audit_json"
          onClick={handleExportJSON}
          className="px-4 py-2 rounded-lg bg-[#151c2c] hover:bg-[#1a2337] border border-[#222c42] text-xs font-mono text-cyan-300 flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Audit JSON</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            id="audit_filter_status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#10141f] border border-[#1e2538] rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="COMPLETED">COMPLETED (Exitoso)</option>
            <option value="PROPOSED">PROPOSED (Propuesto)</option>
            <option value="APPROVED">APPROVED (Aprobado)</option>
            <option value="REJECTED">REJECTED (Rechazado)</option>
            <option value="FAILED">FAILED (Fallido)</option>
          </select>

          {/* Agent Filter */}
          <select
            id="audit_filter_agent"
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="bg-[#10141f] border border-[#1e2538] rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="ALL">Todos los Agentes</option>
            <option value="CORE">JARVIS CORE</option>
            <option value="MARKET_INTELLIGENCE">MARKET INTELLIGENCE</option>
            <option value="SALES">SALES AGENT</option>
            <option value="MARKETING">MARKETING AGENT</option>
            <option value="CRO">CRO AGENT</option>
            <option value="PRODUCT">PRODUCT AGENT</option>
            <option value="AUTOMATION">AUTOMATION AGENT</option>
            <option value="RESEARCH">RESEARCH AGENT</option>
            <option value="EXECUTION">EXECUTION AGENT</option>
          </select>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            id="audit_search_input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar en logs..."
            className="w-full bg-[#10141f] border border-[#1e2538] rounded-lg py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 font-sans"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-[#0f131d] border border-[#1e2538] rounded-xl overflow-hidden shadow-lg shadow-black/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0b0e15] border-b border-[#1e2538] text-[11px] font-mono uppercase text-slate-400">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Agente</th>
                <th className="py-3 px-4">Acción / Evento</th>
                <th className="py-3 px-4">Herramienta</th>
                <th className="py-3 px-4">Usuario / Origen</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2538] text-xs font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No se encontraron registros de auditoría que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        id={`audit_row_${log.id}`}
                        className="hover:bg-[#131824] transition-colors"
                      >
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                          {formatDate(log.timestamp)}
                        </td>
                        <td className="py-3 px-4 font-bold text-cyan-300">
                          {log.agent}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-200">
                          {log.action}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          <code>{log.tool}</code>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {log.user}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              log.status === 'COMPLETED'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : log.status === 'PROPOSED'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : log.status === 'APPROVED'
                                ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                                : 'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="text-slate-400 hover:text-cyan-300 text-[11px] underline"
                          >
                            {isExpanded ? 'Ocultar' : 'Ver Payload'}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-[#090c13]">
                          <td colSpan={7} className="p-4 border-b border-[#1e2538]">
                            <div className="space-y-2 text-xs">
                              <div>
                                <span className="text-slate-400 font-semibold uppercase text-[10px]">
                                  Input Parameters:
                                </span>
                                <pre className="mt-1 p-2 bg-[#06080d] border border-[#1e2538] rounded text-[11px] text-cyan-300 overflow-x-auto">
                                  {typeof log.input === 'object'
                                    ? JSON.stringify(log.input, null, 2)
                                    : log.input}
                                </pre>
                              </div>
                              {log.result && (
                                <div>
                                  <span className="text-slate-400 font-semibold uppercase text-[10px]">
                                    Output / Result:
                                  </span>
                                  <pre className="mt-1 p-2 bg-[#06080d] border border-[#1e2538] rounded text-[11px] text-emerald-300 overflow-x-auto">
                                    {typeof log.result === 'object'
                                      ? JSON.stringify(log.result, null, 2)
                                      : log.result}
                                  </pre>
                                </div>
                              )}
                              {log.durationMs && (
                                <div className="text-[10px] text-slate-500">
                                  Tiempo de Ejecución: {log.durationMs}ms
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
