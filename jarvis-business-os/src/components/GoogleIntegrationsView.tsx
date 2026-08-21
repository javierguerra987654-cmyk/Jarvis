import React, { useState, useEffect } from 'react';
import {
  Globe,
  Search,
  Mail,
  Calendar,
  FileSpreadsheet,
  FolderSync,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Send,
  Lock,
  Unlock,
  Key,
  RefreshCw,
  Play,
  Sliders,
  Eye,
  Check,
  X,
  AlertTriangle,
  FileText,
  Terminal,
  Info,
  Layers,
  Database,
  Radio,
  Clock,
  ShieldAlert,
  UserCheck,
  Cpu,
  Copy,
  Zap,
} from 'lucide-react';
import { dataProvider } from '../lib/dataProvider.js';
import {
  useWorkspaceAuth,
  WorkspaceServiceId,
  workspaceAuth,
  verifyConnectionStatus,
  retrieveConnectionStatus,
  updateConnectionStatus,
  getWorkspaceAccessToken,
  getWorkspaceAuthHeaders,
} from '../lib/auth.js';
import { ToolDefinition, ToolParameterSchema, WorkspaceIntegrationAuth, OAuth2AuthStatus } from '../types.js';

type WorkspaceConnectionStatus = 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR';

const getWorkspaceConnectionState = (
  authStatus?: OAuth2AuthStatus | null
): {
  status: WorkspaceConnectionStatus;
  badgeClass: string;
  dotClass: string;
  label: string;
  description: string;
} => {
  if (!authStatus || !authStatus.isAuthorized) {
    return {
      status: 'NOT_CONFIGURED',
      badgeClass: 'bg-slate-900/80 text-slate-400 border-slate-700/60 shadow-sm',
      dotClass: 'bg-slate-500',
      label: 'NOT_CONFIGURED',
      description: 'Pendiente de autorización OAuth',
    };
  }

  if (authStatus.isExpired) {
    return {
      status: 'ERROR',
      badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-700/60 shadow-sm shadow-rose-950',
      dotClass: 'bg-rose-500 animate-ping',
      label: 'ERROR',
      description: 'Token caducado o inválido',
    };
  }

  return {
    status: 'CONNECTED',
    badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60 shadow-sm shadow-emerald-950',
    dotClass: 'bg-emerald-400 animate-pulse',
    label: 'CONNECTED',
    description: `Válido (${authStatus.expiresAtFormatted})`,
  };
};

interface GoogleIntegrationsViewProps {
  onSearchGroundingTest: (query: string) => Promise<void>;
  isSearching: boolean;
}

interface WorkspaceAppMeta {
  id: 'gmail' | 'calendar' | 'sheets' | 'drive';
  toolId: 'searchEmails' | 'getUpcomingEvents' | 'listSpreadsheets' | 'searchDrive';
  name: string;
  category: string;
  icon: any;
  color: string;
  description: string;
  scope: string;
  scopeDescription: string;
  sampleQuery: string;
  defaultParams: Record<string, any>;
  capabilities: string[];
}

export const GoogleIntegrationsView: React.FC<GoogleIntegrationsViewProps> = ({
  onSearchGroundingTest,
  isSearching,
}) => {
  const [searchQuery, setSearchQuery] = useState(
    'Tendencias de precios y estrategias de retención en empresas B2B SaaS 2026'
  );

  // Use the auth state manager hook
  const {
    statuses,
    getStatus,
    authorize,
    revoke,
    refresh,
    authorizeAll,
    revokeAll,
    isLoading: isAuthLoading,
  } = useWorkspaceAuth();

  const [registeredTools, setRegisteredTools] = useState<ToolDefinition[]>([]);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Tool Testing Drawer / Modal State
  const [activeTestTool, setActiveTestTool] = useState<WorkspaceAppMeta | null>(null);
  const [testToolParams, setTestToolParams] = useState<Record<string, any>>({});
  const [isExecutingTool, setIsExecutingTool] = useState(false);
  const [toolExecutionResult, setToolExecutionResult] = useState<any | null>(null);
  const [toolExecutionError, setToolExecutionError] = useState<string | null>(null);

  // Simulated OAuth Modal State
  const [oauthModalApp, setOauthModalApp] = useState<WorkspaceAppMeta | null>(null);
  const [oauthStep, setOauthStep] = useState<'CONSENT' | 'EXCHANGING' | 'SUCCESS'>('CONSENT');
  const [oauthAccount, setOauthAccount] = useState('javierguerra987654@gmail.com');

  // Token Inspector Modal State
  const [inspectTokenApp, setInspectTokenApp] = useState<WorkspaceAppMeta | null>(null);

  const workspaceApps: WorkspaceAppMeta[] = [
    {
      id: 'gmail',
      toolId: 'searchEmails',
      name: 'Gmail Workspace Integration',
      category: 'Customer Inbound & Opportunity Detection',
      icon: Mail,
      color: '#f87171',
      description: 'Inspecciona hilos y mensajes recibidos para identificar intenciones de compra, consultas de demos y riesgos de churn.',
      scope: 'https://www.googleapis.com/auth/gmail.readonly',
      scopeDescription: 'Acceso de solo lectura a mensajes y etiquetas. Imposible redactar, modificar o eliminar correos.',
      sampleQuery: 'from:investor subject:proposal newer_than:7d is:unread',
      defaultParams: {
        query: 'from:prospect subject:demo newer_than:7d',
        maxResults: 10,
        includeSpamTrash: false,
      },
      capabilities: [
        'Búsqueda estructurada con sintaxis avanzada de Gmail',
        'Detección automática de leads y tickets de alto valor',
        'Extracción de solicitudes de presupuesto sin acceso de escritura',
      ],
    },
    {
      id: 'calendar',
      toolId: 'getUpcomingEvents',
      name: 'Google Calendar Integration',
      category: 'Executive Agendas & Demo Slot Matching',
      icon: Calendar,
      color: '#60a5fa',
      description: 'Consulta reuniones programadas y bloques libres para sugerir horarios de demos con prospectos prioritarios.',
      scope: 'https://www.googleapis.com/auth/calendar.events.readonly',
      scopeDescription: 'Lectura de eventos y disponibilidad. Sin permisos para crear, editar ni cancelar citas.',
      sampleQuery: 'primary - próximos 7 días',
      defaultParams: {
        calendarId: 'primary',
        maxResults: 10,
      },
      capabilities: [
        'Auditoría de tiempo directivo y bloques de foco',
        'Detección de huecos disponibles en las próximas 48 horas',
        'Coordinación de reuniones comerciales sin colisiones',
      ],
    },
    {
      id: 'sheets',
      toolId: 'listSpreadsheets',
      name: 'Google Sheets Integration',
      category: 'Telemetry & Financial Unit Economics',
      icon: FileSpreadsheet,
      color: '#34d399',
      description: 'Consulta y lista hojas de cálculo con datos de ingresos, tablas de precios, métricas de cohortes y balances.',
      scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
      scopeDescription: 'Lectura estricta de hojas de cálculo y celdas. Sin permisos de modificación ni sobrescritura.',
      sampleQuery: 'Master Metrics & Unit Economics 2026',
      defaultParams: {
        query: 'Metrics',
        limit: 10,
      },
      capabilities: [
        'Ingesta de tablas financieras y márgenes unitarios',
        'Sincronización de cálculos de ARR, MRR, CAC y LTV',
        'Validación de datos estructurados de ventas y funnel',
      ],
    },
    {
      id: 'drive',
      toolId: 'searchDrive',
      name: 'Google Drive & Docs Integration',
      category: 'Document Repository & Knowledge Hub',
      icon: FolderSync,
      color: '#fbbf24',
      description: 'Indexa y busca reportes estratégicos, minutas de comités, playbooks de ventas y contratos en Google Drive.',
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      scopeDescription: 'Búsqueda e indexación de solo lectura en Drive. Sin permisos para mover, alterar o eliminar archivos.',
      sampleQuery: 'Q3 Financials OR ICP Playbook',
      defaultParams: {
        query: 'Financials',
        pageSize: 10,
      },
      capabilities: [
        'Búsqueda semántica y por palabras clave en repositorios corporativos',
        'Indexación directa hacia la Memoria de Negocio de JARVIS',
        'Extracción de compromisos y acuerdos contractuales',
      ],
    },
  ];

  // Load tools registry data
  const loadToolsData = async () => {
    try {
      const toolsList = await dataProvider.getTools().catch(() => []);
      setRegisteredTools(toolsList);
    } catch (err) {
      console.error('Error loading tools registry:', err);
    }
  };

  useEffect(() => {
    loadToolsData();
  }, []);

  const showToast = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleStartOAuthSimulation = (app: WorkspaceAppMeta) => {
    setOauthModalApp(app);
    setOauthStep('CONSENT');
  };

  const handleConfirmOAuthConsent = async () => {
    if (!oauthModalApp) return;
    setOauthStep('EXCHANGING');

    // Simulate token exchange and register via auth state manager
    setTimeout(async () => {
      try {
        await authorize(oauthModalApp.id as WorkspaceServiceId, oauthAccount);
        await loadToolsData();
        setOauthStep('SUCCESS');
        showToast(`Token OAuth 2.0 emitido y registrado para ${oauthModalApp.name}`);
      } catch (err: any) {
        showToast(err.message || 'Error en flujo de autorización');
        setOauthModalApp(null);
      }
    }, 1100);
  };

  const handleRevokeAuth = async (serviceId: WorkspaceServiceId) => {
    try {
      await revoke(serviceId);
      showToast(`Token revocado y acceso desconectado para ${serviceId.toUpperCase()}`);
      await loadToolsData();
    } catch (err: any) {
      showToast(err.message || 'Error revocando autorización');
    }
  };

  const handleRefreshToken = async (serviceId: WorkspaceServiceId) => {
    try {
      await refresh(serviceId);
      showToast(`Token renovado exitosamente (+1 hora de validez) para ${serviceId.toUpperCase()}`);
      await loadToolsData();
    } catch (err: any) {
      showToast(err.message || 'Error renovando token');
    }
  };

  const handleToggleAllAuth = async (authorizeTarget: boolean) => {
    try {
      if (authorizeTarget) {
        await authorizeAll(oauthAccount);
        showToast('Toda la suite de Google Workspace autorizada con tokens OAuth 2.0');
      } else {
        await revokeAll();
        showToast('Todos los tokens de Google Workspace revocados y desconectados');
      }
      await loadToolsData();
    } catch (err: any) {
      showToast(err.message || 'Error actualizando autorizaciones');
    }
  };

  const handleOpenTestTool = (app: WorkspaceAppMeta) => {
    setActiveTestTool(app);
    setTestToolParams(app.defaultParams);
    setToolExecutionResult(null);
    setToolExecutionError(null);
  };

  const handleExecuteLiveTest = async () => {
    if (!activeTestTool) return;
    setIsExecutingTool(true);
    setToolExecutionResult(null);
    setToolExecutionError(null);

    try {
      const res = await dataProvider.executeTool(activeTestTool.toolId, testToolParams);
      if (res.success) {
        setToolExecutionResult(res.result);
      } else {
        setToolExecutionError(res.error || 'La herramienta retornó un fallo en ejecución');
      }
    } catch (err: any) {
      setToolExecutionError(err.message || 'Error de comunicación con el ToolRegistry');
    } finally {
      setIsExecutingTool(false);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || isSearching) return;
    await onSearchGroundingTest(searchQuery);
  };

  const allWorkspaceAuthorized = workspaceApps.every((a) => {
    const st = getStatus(a.id as WorkspaceServiceId);
    return st && st.isAuthorized;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Feedback */}
      {actionFeedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#161c2d] border border-cyan-500/40 text-cyan-200 px-4 py-3 rounded-lg shadow-2xl shadow-black/80 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-mono">{actionFeedback}</span>
        </div>
      )}

      {/* Header & Security Governance Banner */}
      <div className="bg-[#10141f] border border-[#1e2538] rounded-xl p-6 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-4 h-4" /> GOOGLE WORKSPACE OAUTH2 AUTH SERVICE & TOOLREGISTRY
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            Centro de Integraciones de Google & Gestor de Tokens OAuth 2.0
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Gestiona en tiempo real los tokens Bearer de Gmail, Drive, Sheets y Calendar mediante el servicio <code className="text-cyan-400 font-mono">src/lib/auth.ts</code>. Todas las consultas se canalizan bajo políticas estrictas de solo lectura.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn_toggle_all_workspace"
            onClick={() => handleToggleAllAuth(!allWorkspaceAuthorized)}
            disabled={isAuthLoading}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-2 cursor-pointer border ${
              allWorkspaceAuthorized
                ? 'bg-red-950/40 border-red-800/60 text-red-300 hover:bg-red-900/60'
                : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/60'
            }`}
          >
            {allWorkspaceAuthorized ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Revocar Toda la Suite</span>
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5" />
                <span>Autorizar Toda la Suite</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Global Status Bar with Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
        {workspaceApps.map((app) => {
          const authStatus = getStatus(app.id as WorkspaceServiceId);
          const Icon = app.icon;
          const connState = getWorkspaceConnectionState(authStatus);

          return (
            <div
              key={app.id}
              className={`bg-[#0c101a] border rounded-lg p-3 flex items-center justify-between transition-all ${
                connState.status === 'CONNECTED'
                  ? 'border-emerald-800/40 text-emerald-300'
                  : connState.status === 'ERROR'
                  ? 'border-rose-800/40 text-rose-300'
                  : 'border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <div
                  className="w-7 h-7 rounded flex items-center justify-center shrink-0 border"
                  style={{
                    backgroundColor: `${app.color}15`,
                    borderColor: `${app.color}40`,
                    color: app.color,
                  }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="text-[11px] font-bold text-slate-200 capitalize">{app.id}</div>
                  <div className="text-[9px] text-slate-400 truncate">
                    {connState.description}
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-1.5">
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${connState.badgeClass}`}
                >
                  {connState.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Security Architecture & Least Privilege Notice */}
      <div className="bg-[#0b0e15] border border-cyan-900/30 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs font-mono text-slate-300">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-slate-100 font-bold flex items-center gap-2">
              <span>Gobernanza de Tokens OAuth 2.0 & Principio de Mínimo Privilegio</span>
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                READ-ONLY TOKENS
              </span>
            </div>
            <p className="text-slate-400 text-[11px] font-sans mt-0.5">
              Los tokens OAuth emitidos por el gestor de autenticación (<code className="text-cyan-400 font-mono">auth.ts</code>) contienen exclusivamente scopes de lectura (<code className="text-slate-300 font-mono">.readonly</code>), imposibilitando cualquier modificación directa en la cuenta de Google.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11px] shrink-0">
          <div className="flex items-center gap-1.5 text-cyan-300 bg-cyan-950/40 px-3 py-1.5 rounded border border-cyan-900/50">
            <Key className="w-3.5 h-3.5 text-cyan-400" />
            <span>State Manager Reactivo</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-300 bg-emerald-950/40 px-3 py-1.5 rounded border border-emerald-900/50">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>ToolRegistry Sincronizado</span>
          </div>
        </div>
      </div>

      {/* Live Google Search Grounding Test Sandbox */}
      <div className="bg-[#0f131d] border border-blue-900/30 rounded-xl p-6 space-y-4 shadow-xl shadow-black/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
              Prueba en Vivo de Google Search Grounding (Web en Tiempo Real)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Verificación factual de competidores y mercado
          </span>
        </div>

        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="flex items-center bg-[#090c13] border border-[#1e2538] rounded-lg p-2 focus-within:border-blue-500/50">
            <input
              id="google_search_grounding_input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ingresa una consulta de investigación para buscar en Google..."
              disabled={isSearching}
              className="w-full bg-transparent px-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none font-sans"
            />
            <button
              id="btn_run_google_search_grounding"
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
            >
              {isSearching ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Buscando...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Investigar con Google</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Workspace Integrations & ToolRegistry Schemas Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
              Herramientas de Workspace en ToolRegistry
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {workspaceApps.filter((a) => getStatus(a.id as WorkspaceServiceId)?.isAuthorized).length} de {workspaceApps.length} servicios autorizados
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {workspaceApps.map((app) => {
            const Icon = app.icon;
            const authStatus = getStatus(app.id as WorkspaceServiceId);
            const connState = getWorkspaceConnectionState(authStatus);
            const isAuthed = connState.status === 'CONNECTED';
            const toolDef = registeredTools.find((t) => t.id === app.toolId);

            return (
              <div
                key={app.id}
                id={`workspace_app_${app.id}`}
                className={`bg-[#0f131d] border rounded-xl p-5 space-y-4 shadow-lg shadow-black/20 flex flex-col justify-between transition-all ${
                  connState.status === 'CONNECTED'
                    ? 'border-[#1e2538] hover:border-emerald-900/60'
                    : connState.status === 'ERROR'
                    ? 'border-rose-900/40 hover:border-rose-800/60'
                    : 'border-[#1e2538] hover:border-[#2a354c]'
                }`}
              >
                <div className="space-y-4">
                  {/* Top bar: Icon, Name, Status Indicator */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-lg flex items-center justify-center border shrink-0"
                        style={{
                          backgroundColor: `${app.color}15`,
                          borderColor: `${app.color}40`,
                          color: app.color,
                        }}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-100">
                            {app.name}
                          </h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                            SOLO LECTURA
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-400">
                          {app.category}
                        </p>
                      </div>
                    </div>

                    {/* Status Indicator Badge: CONNECTED, NOT_CONFIGURED, or ERROR */}
                    <div className="flex flex-col items-end gap-1">
                      <span
                        id={`status_indicator_${app.id}`}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold flex items-center gap-1.5 border ${connState.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${connState.dotClass}`}></span>
                        {connState.label}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500">
                        {connState.description}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {app.description}
                  </p>

                  {/* Live OAuth Token Badge */}
                  {isAuthed && authStatus?.token && (
                    <div className="bg-[#0b0f19] border border-cyan-900/30 rounded-lg p-2.5 space-y-1.5 text-[11px] font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Key className="w-3 h-3 text-cyan-400" />
                          <span>OAuth 2.0 Bearer Token:</span>
                        </span>
                        <button
                          onClick={() => setInspectTokenApp(app)}
                          className="text-[10px] text-cyan-400 hover:text-cyan-200 underline cursor-pointer flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspeccionar</span>
                        </button>
                      </div>
                      <div className="flex items-center justify-between bg-[#06080d] p-1.5 rounded border border-[#172033]">
                        <code className="text-cyan-300 truncate max-w-[260px]">
                          {authStatus.token.accessToken.substring(0, 22)}...
                        </code>
                        <span className="text-[9px] text-emerald-400 bg-emerald-950/60 border border-emerald-900 px-1 py-0.5 rounded">
                          ACTIVO
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Registered Tool Schema Card */}
                  <div className="bg-[#090c13] border border-[#1e2538] rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                        Tool ID: <strong className="text-cyan-300">{app.toolId}</strong>
                      </span>
                      <span className="text-slate-500 text-[10px]">
                        Risk: <span className="text-emerald-400 font-bold">LOW</span> | Perm: <span className="text-blue-400 font-bold">READ</span>
                      </span>
                    </div>

                    {toolDef?.parameters && (
                      <div className="text-[10px] font-mono bg-[#0d111a] p-2 rounded border border-[#171e2e] space-y-1">
                        <div className="text-slate-500 uppercase font-semibold">Parámetros del Esquema:</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-slate-300">
                          {Object.entries(toolDef.parameters).map(([key, schemaVal]) => {
                            const schema = schemaVal as ToolParameterSchema;
                            return (
                              <div key={key} className="flex items-center gap-1 truncate">
                                <span className="text-cyan-400">{key}</span>
                                <span className="text-slate-500">({schema.type})</span>
                                {schema.required && <span className="text-red-400 text-[9px]">*</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* OAuth Scope & Account */}
                  <div className="space-y-1.5 bg-[#0a0d16] border border-[#1a2336] p-2.5 rounded-lg">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-400">OAuth Scope Obligatorio:</span>
                      <span className="text-cyan-300 font-semibold truncate max-w-[220px]" title={app.scope}>
                        {app.scope}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans italic">
                      "{app.scopeDescription}"
                    </p>
                  </div>

                  {/* Capabilities List */}
                  <div className="space-y-1 pt-1">
                    <div className="text-[10px] font-mono uppercase text-slate-500 font-semibold">
                      Capacidades Autónomas Habilitadas:
                    </div>
                    <div className="space-y-1">
                      {app.capabilities.map((cap, i) => (
                        <div
                          key={i}
                          className="text-[11px] font-mono text-slate-300 flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>{cap}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions: Authorize (OAuth Flow), Refresh & Revoke & Test Tool */}
                <div className="pt-4 border-t border-[#1e2538] flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    {!isAuthed ? (
                      <button
                        id={`btn_authorize_${app.id}`}
                        onClick={() => handleStartOAuthSimulation(app)}
                        disabled={isAuthLoading}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950 disabled:opacity-50"
                      >
                        <Key className="w-3 h-3 text-white" />
                        <span>Authorize</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          id={`btn_reauthorize_${app.id}`}
                          onClick={() => handleRefreshToken(app.id as WorkspaceServiceId)}
                          disabled={isAuthLoading}
                          className="px-2.5 py-1.5 bg-[#172033] hover:bg-blue-600/60 border border-blue-500/30 text-blue-300 hover:text-white rounded text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title="Renovar Access Token (+1 hora)"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Renovar Token</span>
                        </button>
                        <button
                          id={`btn_revoke_${app.id}`}
                          onClick={() => handleRevokeAuth(app.id as WorkspaceServiceId)}
                          disabled={isAuthLoading}
                          className="px-2.5 py-1.5 bg-red-950/30 border border-red-900/50 hover:bg-red-900/50 text-red-300 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Lock className="w-3 h-3 text-red-400" />
                          <span>Revocar</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    id={`btn_test_tool_${app.id}`}
                    onClick={() => handleOpenTestTool(app)}
                    className="px-3.5 py-1.5 bg-[#172033] hover:bg-blue-600 border border-blue-500/30 text-blue-200 hover:text-white rounded text-[11px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Play className="w-3 h-3 text-cyan-400" />
                    <span>Probar Herramienta</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Simulated OAuth Flow Consent Modal */}
      {oauthModalApp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#10141f] border border-[#2a354c] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl shadow-black relative animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header with Google Identity Mockup */}
            <div className="flex items-start justify-between border-b border-[#1e2538] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow">
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Google OAuth 2.0 Consent
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    JARVIS Autonomous Business Platform
                  </p>
                </div>
              </div>

              {oauthStep !== 'EXCHANGING' && (
                <button
                  id="btn_close_oauth_modal"
                  onClick={() => setOauthModalApp(null)}
                  className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* OAuth Step 1: CONSENT */}
            {oauthStep === 'CONSENT' && (
              <div className="space-y-4">
                <div className="bg-[#090c13] border border-[#1e2538] rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold text-xs">
                      JG
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        Javier Guerra
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {oauthAccount}
                      </div>
                    </div>
                  </div>
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    <strong className="text-white">JARVIS Business Core</strong> solicita acceso de{' '}
                    <strong className="text-emerald-400">SOLO LECTURA</strong> para el servicio:{' '}
                    <span className="text-cyan-300 font-mono font-semibold">
                      {oauthModalApp.name}
                    </span>
                  </p>

                  <div className="bg-[#0e1422] border border-[#1e2a42] rounded-xl p-3 space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-200">
                          Alcance Solicitado (Scope):
                        </div>
                        <code className="text-[11px] text-cyan-300 font-mono break-all block mt-0.5">
                          {oauthModalApp.scope}
                        </code>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {oauthModalApp.scopeDescription}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-950/30 border border-blue-800/40 rounded-lg p-2.5 flex items-center gap-2 text-[11px] text-blue-200 font-mono">
                    <Info className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>
                      Herramienta asignada en ToolRegistry:{' '}
                      <strong className="text-white">{oauthModalApp.toolId}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1e2538]">
                  <button
                    id="btn_cancel_oauth_consent"
                    onClick={() => setOauthModalApp(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-mono font-semibold transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    id="btn_confirm_oauth_consent"
                    onClick={handleConfirmOAuthConsent}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-mono font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-900/30"
                  >
                    <Check className="w-4 h-4" />
                    <span>Permitir y Vincular Tool</span>
                  </button>
                </div>
              </div>
            )}

            {/* OAuth Step 2: EXCHANGING TOKEN */}
            {oauthStep === 'EXCHANGING' && (
              <div className="py-8 text-center space-y-4">
                <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
                  <div className="w-14 h-14 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin"></div>
                  <Cpu className="w-6 h-6 text-cyan-400 absolute" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100 font-mono">
                    Intercambiando Token OAuth 2.0...
                  </h4>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    Registrando esquema de solo lectura en el ToolRegistry del Servidor
                  </p>
                </div>
              </div>
            )}

            {/* OAuth Step 3: SUCCESS */}
            {oauthStep === 'SUCCESS' && (
              <div className="space-y-4 py-2 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100 font-mono">
                    ¡Autorización Concluida Exitosamente!
                  </h4>
                  <p className="text-xs text-slate-400 font-sans mt-1">
                    El servicio <strong className="text-white">{oauthModalApp.name}</strong> está sincronizado. La herramienta <strong className="text-cyan-300 font-mono">{oauthModalApp.toolId}</strong> está lista para responder consultas autónomas.
                  </p>
                </div>

                <div className="pt-3 border-t border-[#1e2538]">
                  <button
                    id="btn_done_oauth"
                    onClick={() => setOauthModalApp(null)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer"
                  >
                    Entendido y Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Token Inspector Modal */}
      {inspectTokenApp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#10141f] border border-[#2a354c] rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl shadow-black relative">
            <div className="flex items-start justify-between border-b border-[#1e2538] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded bg-cyan-950/60 border border-cyan-800 text-cyan-400">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    Inspección de Token OAuth 2.0
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {inspectTokenApp.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectTokenApp(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const status = getStatus(inspectTokenApp.id as WorkspaceServiceId);
              const token = status?.token;
              if (!token) return <p className="text-xs text-slate-400">Sin token activo.</p>;

              return (
                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Access Token (Bearer):</span>
                    <div className="bg-[#090c13] p-2 rounded border border-[#1e2538] text-cyan-300 break-all text-[11px] select-all">
                      {token.accessToken}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Refresh Token:</span>
                    <div className="bg-[#090c13] p-2 rounded border border-[#1e2538] text-slate-400 break-all text-[11px] select-all">
                      {token.refreshToken || 'N/A'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-[#090c13] p-2 rounded border border-[#1e2538]">
                      <span className="text-slate-500 block text-[10px]">Cuenta Vinculada:</span>
                      <span className="text-slate-200">{token.accountEmail}</span>
                    </div>
                    <div className="bg-[#090c13] p-2 rounded border border-[#1e2538]">
                      <span className="text-slate-500 block text-[10px]">Tiempo Restante:</span>
                      <span className="text-emerald-400 font-bold">{status.expiresAtFormatted}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Scopes Otorgados:</span>
                    <div className="space-y-1 mt-1">
                      {token.scopes.map((s, idx) => (
                        <div key={idx} className="bg-[#0e1422] p-1.5 rounded border border-[#1a2336] text-[10px] text-cyan-300 flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="pt-3 border-t border-[#1e2538] flex justify-end">
              <button
                onClick={() => setInspectTokenApp(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Tool Execution & Test Sandbox Modal */}
      {activeTestTool && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#10141f] border border-[#222c42] rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-2xl shadow-black relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#1e2538] pb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center border"
                  style={{
                    backgroundColor: `${activeTestTool.color}15`,
                    borderColor: `${activeTestTool.color}40`,
                    color: activeTestTool.color,
                  }}
                >
                  <activeTestTool.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <span>Prueba en Vivo: {activeTestTool.toolId}</span>
                    <span className="text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800 px-1.5 py-0.5 rounded">
                      READ-ONLY TEST
                    </span>
                  </h3>
                  <p className="text-xs font-mono text-slate-400">
                    {activeTestTool.name} &bull; Scope: {activeTestTool.scope}
                  </p>
                </div>
              </div>

              <button
                id="btn_close_tool_modal"
                onClick={() => setActiveTestTool(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Parameters Config */}
            <div className="space-y-3">
              <div className="text-xs font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                Parámetros de Ejecución
              </div>

              <div className="grid grid-cols-1 gap-3 bg-[#090c13] border border-[#1e2538] rounded-lg p-3.5">
                {Object.keys(testToolParams).map((paramKey) => {
                  const val = testToolParams[paramKey];
                  return (
                    <div key={paramKey} className="space-y-1">
                      <label className="text-[11px] font-mono text-slate-300 flex items-center justify-between">
                        <span className="text-cyan-400 font-semibold">{paramKey}</span>
                        <span className="text-slate-500 text-[10px]">{typeof val}</span>
                      </label>
                      {typeof val === 'boolean' ? (
                        <select
                          value={String(val)}
                          onChange={(e) =>
                            setTestToolParams((prev) => ({
                              ...prev,
                              [paramKey]: e.target.value === 'true',
                            }))
                          }
                          className="w-full bg-[#111724] border border-[#222c42] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                        >
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </select>
                      ) : (
                        <input
                          type={typeof val === 'number' ? 'number' : 'text'}
                          value={val ?? ''}
                          onChange={(e) =>
                            setTestToolParams((prev) => ({
                              ...prev,
                              [paramKey]:
                                typeof val === 'number' ? Number(e.target.value) : e.target.value,
                            }))
                          }
                          className="w-full bg-[#111724] border border-[#222c42] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-mono text-slate-400">
                  Operación con garantía de no alteración ni eliminación de datos.
                </span>
                <button
                  id="btn_run_tool_execution"
                  onClick={handleExecuteLiveTest}
                  disabled={isExecutingTool}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-mono font-semibold transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isExecutingTool ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Ejecutando Consulta...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Ejecutar {activeTestTool.toolId}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {toolExecutionError && (
              <div className="bg-red-950/40 border border-red-800/60 p-3.5 rounded-lg flex items-start gap-2.5 text-xs text-red-200">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Error en la ejecución de la herramienta:</strong>
                  <p className="mt-0.5 font-mono">{toolExecutionError}</p>
                </div>
              </div>
            )}

            {/* Result Structured Preview */}
            {toolExecutionResult && (
              <div className="space-y-2 border-t border-[#1e2538] pt-4">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 font-bold">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Respuesta Estructurada del ToolRegistry
                  </span>
                  <span className="text-slate-500 text-[10px]">
                    Status: <strong className="text-emerald-400">200 OK</strong>
                  </span>
                </div>

                <div className="bg-[#07090f] border border-[#1a2236] rounded-lg p-3 max-h-64 overflow-y-auto font-mono text-xs text-slate-200">
                  <pre className="whitespace-pre-wrap leading-relaxed text-[11px] text-cyan-200">
                    {JSON.stringify(toolExecutionResult, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
