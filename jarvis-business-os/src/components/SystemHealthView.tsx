import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Database,
  Cpu,
  ShieldAlert,
  Terminal,
  Play,
  Layers,
  Wrench,
  Clock,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Server,
  Code2,
} from 'lucide-react';
import { SystemHealthInfo, ToolDefinition } from '../types.js';
import { dataProvider } from '../lib/dataProvider.js';
import { DataSourceBadge } from './DataSourceBadge.js';

interface SystemHealthViewProps {
  onTriggerRefresh: () => void;
}

export const SystemHealthView: React.FC<SystemHealthViewProps> = ({ onTriggerRefresh }) => {
  const [health, setHealth] = useState<SystemHealthInfo | null>(null);
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [selectedTool, setSelectedTool] = useState<ToolDefinition | null>(null);
  const [toolArgsInput, setToolArgsInput] = useState<string>('{}');
  const [executionOutput, setExecutionOutput] = useState<any | null>(null);
  const [isExecutingTool, setIsExecutingTool] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const fetchHealthAndTools = async () => {
    try {
      setLoading(true);
      const [hData, tData] = await Promise.all([
        dataProvider.getSystemHealth(),
        dataProvider.getTools(),
      ]);
      setHealth(hData);
      setTools(tData);
      if (tData.length > 0 && !selectedTool) {
        setSelectedTool(tData[0]);
        // Prefill default sample args
        const defaultArgs: Record<string, any> = {};
        for (const [key, prop] of Object.entries(tData[0].parameters.properties)) {
          defaultArgs[key] = (prop as any).type === 'string' ? '' : (prop as any).type === 'number' ? 0 : {};
        }
        setToolArgsInput(JSON.stringify(defaultArgs, null, 2));
      }
    } catch (err: any) {
      console.error('Error fetching health and tools:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthAndTools();
  }, []);

  const handleSelectTool = (tool: ToolDefinition) => {
    setSelectedTool(tool);
    setExecutionOutput(null);
    const sampleArgs: Record<string, any> = {};
    if (tool.id === 'query_google_search') {
      sampleArgs.query = 'Tendencias SaaS B2B 2026 pricing models';
    } else if (tool.id === 'read_business_memory') {
      sampleArgs.category = 'pricing';
      sampleArgs.searchQuery = 'Enterprise';
    } else if (tool.id === 'write_business_memory') {
      sampleArgs.category = 'operations';
      sampleArgs.title = 'Nuevo SOP de atención';
      sampleArgs.content = 'Documentación de flujo de escalado Nivel 2';
      sampleArgs.tags = ['sop', 'support'];
    } else if (tool.id === 'audit_cost_structures') {
      sampleArgs.department = 'Engineering';
      sampleArgs.minVariancePercent = 10;
    } else if (tool.id === 'detect_sales_stalls') {
      sampleArgs.daysWithoutContact = 7;
      sampleArgs.minimumDealValue = 5000;
    } else if (tool.id === 'draft_client_proposal') {
      sampleArgs.clientName = 'Acme Corp';
      sampleArgs.dealValue = 45000;
      sampleArgs.offeringDetails = 'Licencia Enterprise JARVIS OS';
    } else if (tool.id === 'query_google_workspace') {
      sampleArgs.service = 'gmail';
      sampleArgs.query = 'Contratos pendientes firma';
    } else if (tool.id === 'trigger_agent_subtask') {
      sampleArgs.targetAgent = 'FINANCE';
      sampleArgs.taskDescription = 'Auditoría de SaaS duplicados';
    } else if (tool.id === 'calculate_deal_margin') {
      sampleArgs.basePrice = 12000;
      sampleArgs.discountPercent = 15;
      sampleArgs.fixedCost = 3000;
    } else {
      for (const [key, prop] of Object.entries(tool.parameters.properties)) {
        sampleArgs[key] = (prop as any).type === 'string' ? 'test' : 0;
      }
    }
    setToolArgsInput(JSON.stringify(sampleArgs, null, 2));
  };

  const handleToggleDataMode = async () => {
    if (!health) return;
    const newMode = health.dataMode === 'REAL' ? 'DEMO' : 'REAL';
    try {
      await dataProvider.setDataMode(newMode);
      setFeedbackMsg(`Modo cambiado a: ${newMode}`);
      setTimeout(() => setFeedbackMsg(null), 3000);
      await fetchHealthAndTools();
      onTriggerRefresh();
    } catch (err: any) {
      alert(`Error cambiando modo: ${err.message}`);
    }
  };

  const handleRunTool = async () => {
    if (!selectedTool) return;
    setIsExecutingTool(true);
    setExecutionOutput(null);
    try {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(toolArgsInput);
      } catch (jsonErr) {
        throw new Error('Los argumentos deben ser un JSON válido');
      }

      const res = await dataProvider.executeTool(selectedTool.id, parsedArgs);
      setExecutionOutput(res);
      onTriggerRefresh();
    } catch (err: any) {
      setExecutionOutput({
        success: false,
        tool: selectedTool.id,
        error: err.message || 'Error en ejecución de herramienta',
        durationMs: 0,
      });
    } finally {
      setIsExecutingTool(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Status */}
      <div className="bg-[#10141f] border border-[#1e2538] rounded-xl p-6 shadow-xl shadow-black/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#1e2538] pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-950/40">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider font-mono">
                  Diagnóstico del Sistema & Tool Registry
                </h2>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Verificación de salud en tiempo real, registro de herramientas server-side y conmutador de datos
              </p>
            </div>
          </div>

          {/* Mode Switch Button */}
          <div className="flex items-center gap-3 bg-[#0b0e15] border border-[#1e2538] rounded-lg px-4 py-2">
            <div className="text-right">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Modo de Datos Activo</div>
              <div className="text-xs font-bold text-slate-200">
                {health?.dataMode === 'REAL' ? 'Datos Reales de Producción' : 'Datos Demo & Simulación'}
              </div>
            </div>
            <button
              id="btn_toggle_data_mode"
              onClick={handleToggleDataMode}
              className="p-1.5 rounded-md bg-[#161c2b] border border-[#263147] hover:border-cyan-500/50 text-cyan-400 transition-colors"
              title="Alternar entre REAL y DEMO"
            >
              {health?.dataMode === 'REAL' ? (
                <ToggleRight className="w-6 h-6 text-emerald-400" />
              ) : (
                <ToggleLeft className="w-6 h-6 text-cyan-400" />
              )}
            </button>
          </div>
        </div>

        {feedbackMsg && (
          <div className="mb-4 p-3 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Health Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-[#0b0e15] border border-[#1e2538] rounded-lg p-3 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
              <Cpu className="w-3 h-3 text-cyan-400" /> Gemini Engine
            </div>
            <div className={`text-sm font-bold font-mono flex items-center gap-1.5 ${
              health?.geminiQuotaLimited 
                ? 'text-amber-400' 
                : health?.geminiConnected 
                  ? 'text-emerald-400' 
                  : 'text-slate-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                health?.geminiQuotaLimited ? 'bg-amber-400' : health?.geminiConnected ? 'bg-emerald-400' : 'bg-slate-500'
              }`}></span>
              {health?.geminiQuotaLimited
                ? 'Fallback Heurístico'
                : health?.geminiConnected
                  ? 'Conectado (Live)'
                  : 'Sin Clave'}
            </div>
            <div className="text-[10px] font-mono text-slate-400 truncate" title={health?.geminiModel || 'gemini-3.7-flash'}>
              {health?.geminiQuotaLimited ? 'Quota Limit Manejado' : (health?.geminiModel || 'gemini-3.7-flash')}
            </div>
          </div>

          <div className="bg-[#0b0e15] border border-[#1e2538] rounded-lg p-3 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" /> Server Uptime
            </div>
            <div className="text-sm font-bold text-slate-200 font-mono">
              {health ? `${Math.floor(health.serverUptimeSeconds / 60)}m ${health.serverUptimeSeconds % 60}s` : '--'}
            </div>
            <div className="text-[10px] font-mono text-slate-400">Node / Express API</div>
          </div>

          <div className="bg-[#0b0e15] border border-[#1e2538] rounded-lg p-3 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
              <Wrench className="w-3 h-3 text-cyan-400" /> Herramientas
            </div>
            <div className="text-sm font-bold text-cyan-400 font-mono">
              {health?.registeredToolsCount || tools.length} Registradas
            </div>
            <div className="text-[10px] font-mono text-slate-400">Ejecución server-side</div>
          </div>

          <div className="bg-[#0b0e15] border border-[#1e2538] rounded-lg p-3 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
              <Database className="w-3 h-3 text-cyan-400" /> Memoria /memory
            </div>
            <div className="text-sm font-bold text-slate-200 font-mono">
              {health?.memoryItemsCount || 0} Ítems
            </div>
            <div className="text-[10px] font-mono text-slate-400">Contexto persistente</div>
          </div>

          <div className="bg-[#0b0e15] border border-[#1e2538] rounded-lg p-3 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-amber-400" /> Propuestas HITL
            </div>
            <div className="text-sm font-bold text-amber-400 font-mono">
              {health?.proposalsCount || 0} Registradas
            </div>
            <div className="text-[10px] font-mono text-slate-400">Gobernanza activa</div>
          </div>

          <div className="bg-[#0b0e15] border border-[#1e2538] rounded-lg p-3 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
              <Activity className="w-3 h-3 text-cyan-400" /> Audit Trail
            </div>
            <div className="text-sm font-bold text-slate-200 font-mono">
              {health?.auditLogsCount || 0} Eventos
            </div>
            <div className="text-[10px] font-mono text-slate-400">Log inmutable</div>
          </div>
        </div>
      </div>

      {/* Tool Registry Explorer & Interactive Tester */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tool List (Left 5 Cols) */}
        <div className="lg:col-span-5 bg-[#10141f] border border-[#1e2538] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1e2538] pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                Catálogo de Herramientas Registradas ({tools.length})
              </h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-400">Server-Side Verified</span>
          </div>

          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {tools.map((t) => {
              const isSelected = selectedTool?.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelectTool(t)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-[#151c2b] border-cyan-500/50 shadow-md text-cyan-200'
                      : 'bg-[#0b0e15] border-[#1e2538] hover:border-[#2b354d] text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-slate-100 flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                      {t.name}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        t.riskLevel === 'HIGH' || t.riskLevel === 'CRITICAL'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : t.riskLevel === 'MEDIUM'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      }`}
                    >
                      {t.riskLevel} RISK
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {t.description}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>Cat: {t.category}</span>
                    <span>Req Auth: {t.requiresAuth ? 'YES' : 'NO'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Tool Execution & Inspector (Right 7 Cols) */}
        <div className="lg:col-span-7 bg-[#10141f] border border-[#1e2538] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1e2538] pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                Inspector & Tester de Herramienta
              </h3>
            </div>
            {selectedTool && (
              <span className="text-xs font-mono text-slate-400">
                ID: <code className="text-cyan-300">{selectedTool.id}</code>
              </span>
            )}
          </div>

          {selectedTool ? (
            <div className="space-y-4">
              {/* Tool Schema & Details */}
              <div className="bg-[#0b0e15] border border-[#1e2538] rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-100 font-mono">
                    {selectedTool.name}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400">
                      Permiso: <strong className="text-cyan-400">{selectedTool.requiredPermission}</strong>
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedTool.description}
                </p>

                {/* Schema properties list */}
                <div className="pt-2 border-t border-[#182030] mt-2">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block mb-1">
                    Parámetros Aceptados:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {Object.entries(selectedTool.parameters.properties).map(([pName, pVal]: [string, any]) => (
                      <div key={pName} className="bg-[#121724] border border-[#1e2538] p-2 rounded">
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="text-cyan-300 font-bold">{pName}</span>
                          <span className="text-slate-500">({pVal.type})</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{pVal.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Arguments JSON Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Argumentos de Entrada (JSON):</span>
                  <button
                    onClick={() => handleSelectTool(selectedTool)}
                    className="text-[10px] text-cyan-400 hover:underline"
                  >
                    Restablecer Ejemplo
                  </button>
                </div>
                <textarea
                  id="tool_args_json_input"
                  rows={5}
                  value={toolArgsInput}
                  onChange={(e) => setToolArgsInput(e.target.value)}
                  className="w-full bg-[#080a0f] border border-[#1e2538] rounded-lg p-3 font-mono text-xs text-cyan-200 focus:outline-none focus:border-cyan-500/60"
                />
              </div>

              {/* Execution Action Button */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">
                  {selectedTool.requiresAuth
                    ? '⚠️ Requiere autorización OAuth o confirmación'
                    : '⚡ Ejecución instantánea server-side'}
                </span>
                <button
                  id="btn_execute_tool_tester"
                  onClick={handleRunTool}
                  disabled={isExecutingTool}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold transition-all shadow-md shadow-cyan-950/40 disabled:opacity-50 cursor-pointer"
                >
                  {isExecutingTool ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Ejecutando...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Ejecutar Herramienta</span>
                    </>
                  )}
                </button>
              </div>

              {/* Execution Output Viewer */}
              {executionOutput && (
                <div className="bg-[#080a0f] border border-[#1e2538] rounded-lg p-4 space-y-2 mt-4">
                  <div className="flex items-center justify-between border-b border-[#182030] pb-2">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold">
                      {executionOutput.success ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">EJECUCIÓN EXITOSA</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                          <span className="text-rose-400">FALLO EN EJECUCIÓN</span>
                        </>
                      )}
                      <span className="text-slate-500">({executionOutput.durationMs}ms)</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      Auditado en Log
                    </span>
                  </div>
                  <pre className="text-[11px] font-mono text-slate-200 overflow-x-auto p-2 bg-[#0b0e15] rounded max-h-60">
                    {JSON.stringify(executionOutput, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 font-mono text-xs">
              Selecciona una herramienta del catálogo para inspeccionar y ejecutar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
