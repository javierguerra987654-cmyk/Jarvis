import { ToolDefinition, AutonomyLevel } from '../../src/types.js';
import { storage } from '../storage.js';

export interface ToolExecutionContext {
  user: string;
  agentRole: string;
  autonomyLevel: AutonomyLevel | string;
}

export interface ToolExecutionResponse {
  success: boolean;
  tool: string;
  result: any;
  durationMs: number;
  error?: string;
}

const workspaceToolIds = new Set([
  'searchEmails',
  'searchDrive',
  'listSpreadsheets',
  'getUpcomingEvents',
  'queryGoogleWorkspace',
]);

export const registeredTools: ToolDefinition[] = [
  {
    id: 'queryBusinessMemory',
    name: 'Consultar Memoria de Negocio',
    category: 'MEMORY',
    description: 'Consulta la memoria persistente de JARVIS.',
    riskLevel: 'LOW',
    requiredPermission: 'READ',
    isAutonomousSafe: true,
    parameters: {
      category: { type: 'string', description: 'Categoría de memoria o ALL' },
      query: { type: 'string', description: 'Términos de búsqueda' },
    },
  },
  {
    id: 'storeBusinessMemory',
    name: 'Almacenar en Memoria de Negocio',
    category: 'MEMORY',
    description: 'Guarda un aprendizaje o decisión en memoria.',
    riskLevel: 'LOW',
    requiredPermission: 'ANALYZE',
    isAutonomousSafe: true,
    parameters: {
      category: { type: 'string', description: 'Categoría', required: true },
      title: { type: 'string', description: 'Título', required: true },
      content: { type: 'string', description: 'Contenido factual', required: true },
      tags: { type: 'array', description: 'Etiquetas' },
    },
  },
  {
    id: 'calculateBusinessMetrics',
    name: 'Cálculo de Métricas Financieras',
    category: 'ANALYTICS',
    description: 'Calcula métricas usando únicamente el estado disponible en JARVIS.',
    riskLevel: 'LOW',
    requiredPermission: 'ANALYZE',
    isAutonomousSafe: true,
    parameters: {
      metricType: { type: 'string', description: 'Tipo de cálculo', required: true },
      timeframe: { type: 'string', description: 'Ventana temporal' },
    },
  },
  {
    id: 'queryCrmLeads',
    name: 'Consulta de Pipeline Comercial',
    category: 'CRM',
    description: 'Consulta datos de CRM solo cuando exista un conector real.',
    riskLevel: 'LOW',
    requiredPermission: 'READ',
    isAutonomousSafe: true,
    parameters: {
      status: { type: 'string', description: 'Estado del pipeline' },
      minIcpScore: { type: 'number', description: 'ICP mínimo' },
      inactivityDays: { type: 'number', description: 'Días de inactividad' },
    },
  },
  {
    id: 'analyzeCompetitorMoves',
    name: 'Radar de Competidores y Precios',
    category: 'SEARCH',
    description: 'Análisis competitivo. Debe usar una fuente web real; no usa fixtures.',
    riskLevel: 'LOW',
    requiredPermission: 'READ',
    isAutonomousSafe: true,
    parameters: {
      competitorName: { type: 'string', description: 'Competidor o sector' },
      focusArea: { type: 'string', description: 'Pricing, features, limits o reviews' },
    },
  },
  {
    id: 'auditFunnelDropoff',
    name: 'Auditoría de Conversión y Fricción UX',
    category: 'ANALYTICS',
    description: 'Analiza métricas disponibles sin inventar datos de tráfico.',
    riskLevel: 'LOW',
    requiredPermission: 'ANALYZE',
    isAutonomousSafe: true,
    parameters: {
      funnelStep: { type: 'string', description: 'Paso del funnel' },
      device: { type: 'string', description: 'mobile, desktop o all' },
    },
  },
  {
    id: 'searchEmails',
    name: 'Búsqueda de Emails (Gmail)',
    category: 'WORKSPACE',
    description: 'Búsqueda real de Gmail mediante un conector OAuth configurado.',
    riskLevel: 'LOW',
    requiredPermission: 'READ',
    isAutonomousSafe: true,
    requiresAuth: true,
    readOnly: true,
    associatedService: 'gmail',
    requiredScopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    parameters: {
      query: { type: 'string', description: 'Consulta Gmail', required: true },
      maxResults: { type: 'number', description: 'Máximo 50' },
      includeSpamTrash: { type: 'boolean', description: 'Incluir spam y papelera' },
    },
  },
  {
    id: 'searchDrive',
    name: 'Búsqueda de Archivos (Google Drive)',
    category: 'WORKSPACE',
    description: 'Búsqueda real de Drive mediante un conector OAuth configurado.',
    riskLevel: 'LOW',
    requiredPermission: 'READ',
    isAutonomousSafe: true,
    requiresAuth: true,
    readOnly: true,
    associatedService: 'drive',
    requiredScopes: ['https://www.googleapis.com/auth/drive.readonly'],
    parameters: {
      query: { type: 'string', description: 'Consulta Drive', required: true },
      mimeType: { type: 'string', description: 'Filtro MIME' },
      pageSize: { type: 'number', description: 'Máximo 50' },
    },
  },
  {
    id: 'listSpreadsheets',
    name: 'Listar Hojas de Cálculo',
    category: 'WORKSPACE',
    description: 'Consulta real de Google Sheets mediante OAuth.',
    riskLevel: 'LOW',
    requiredPermission: 'READ',
    isAutonomousSafe: true,
    requiresAuth: true,
    readOnly: true,
    associatedService: 'sheets',
    requiredScopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    parameters: {
      query: { type: 'string', description: 'Filtro' },
      modifiedAfter: { type: 'string', description: 'Fecha ISO' },
      limit: { type: 'number', description: 'Máximo 50' },
    },
  },
  {
    id: 'getUpcomingEvents',
    name: 'Consultar Eventos de Agenda',
    category: 'WORKSPACE',
    description: 'Consulta real de Calendar mediante OAuth.',
    riskLevel: 'LOW',
    requiredPermission: 'READ',
    isAutonomousSafe: true,
    requiresAuth: true,
    readOnly: true,
    associatedService: 'calendar',
    requiredScopes: ['https://www.googleapis.com/auth/calendar.events.readonly'],
    parameters: {
      timeMin: { type: 'string', description: 'Inicio ISO' },
      timeMax: { type: 'string', description: 'Fin ISO' },
      maxResults: { type: 'number', description: 'Máximo 50' },
      calendarId: { type: 'string', description: 'Calendario' },
    },
  },
  {
    id: 'queryGoogleWorkspace',
    name: 'Conector Google Workspace Unificado',
    category: 'WORKSPACE',
    description: 'Consulta unificada real de Gmail, Calendar, Drive o Sheets.',
    riskLevel: 'LOW',
    requiredPermission: 'READ',
    isAutonomousSafe: true,
    requiresAuth: true,
    readOnly: true,
    associatedService: 'gmail',
    requiredScopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/calendar.events.readonly',
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
    ],
    parameters: {
      service: { type: 'string', description: 'gmail, calendar, drive o sheets', required: true },
      query: { type: 'string', description: 'Consulta', required: true },
    },
  },
  {
    id: 'executeAuthorizedAction',
    name: 'Ejecutor de Acciones Gobernadas',
    category: 'EXECUTION',
    description: 'Ejecuta únicamente propuestas previamente aprobadas.',
    riskLevel: 'HIGH',
    requiredPermission: 'EXECUTE',
    isAutonomousSafe: false,
    parameters: {
      proposalId: { type: 'string', description: 'ID de propuesta aprobada', required: true },
      actionType: { type: 'string', description: 'Tipo de acción', required: true },
      payload: { type: 'object', description: 'Parámetros validados' },
    },
  },
];

function workspaceConnectorReady(toolId: string): boolean {
  return process.env.JARVIS_REAL_WORKSPACE_CONNECTORS === 'true' && !workspaceToolIds.has(toolId) || false;
}

function hasOperatorToken(): boolean {
  return Boolean(process.env.JARVIS_OPERATOR_TOKEN);
}

export async function executeTool(
  toolId: string,
  args: Record<string, any>,
  context: ToolExecutionContext,
): Promise<ToolExecutionResponse> {
  const startTime = Date.now();
  const tool = registeredTools.find((candidate) => candidate.id === toolId);

  if (!tool) {
    return { success: false, tool: toolId, result: null, error: `Tool ${toolId} not found`, durationMs: Date.now() - startTime };
  }

  delete args._bypassAuth;

  if (workspaceToolIds.has(toolId)) {
    const ready = workspaceConnectorReady(toolId);
    if (!ready) {
      const error = `Workspace connector '${toolId}' is not configured. JARVIS will not return synthetic data.`;
      storage.logAudit({
        user: context.user,
        agent: context.agentRole as any,
        action: `TOOL_BLOCKED_${toolId.toUpperCase()}`,
        tool: toolId,
        input: args,
        result: error,
        status: 'FAILED',
        error,
        durationMs: Date.now() - startTime,
      });
      return { success: false, tool: toolId, result: null, error, durationMs: Date.now() - startTime };
    }
    return {
      success: false,
      tool: toolId,
      result: null,
      error: `Connector '${toolId}' is enabled but no real adapter is installed yet. Refusing to fabricate a response.`,
      durationMs: Date.now() - startTime,
    };
  }

  if (tool.requiredPermission === 'EXECUTE') {
    if (!hasOperatorToken()) {
      return {
        success: false,
        tool: toolId,
        result: null,
        error: 'High-risk execution is disabled until JARVIS_OPERATOR_TOKEN is configured on the server.',
        durationMs: Date.now() - startTime,
      };
    }
    if (context.autonomyLevel !== 'HIGH') {
      return {
        success: false,
        tool: toolId,
        result: null,
        error: `Tool '${toolId}' requires autonomy level HIGH. Current level: ${context.autonomyLevel}.`,
        durationMs: Date.now() - startTime,
      };
    }
    if (!args.proposalId) {
      return { success: false, tool: toolId, result: null, error: 'proposalId is required', durationMs: Date.now() - startTime };
    }
  }

  try {
    let result: any;

    switch (toolId) {
      case 'queryBusinessMemory':
        result = storage.getMemory(args.category || 'ALL', args.query);
        break;
      case 'storeBusinessMemory':
        if (!args.title || !args.content) throw new Error('title and content are required');
        result = storage.storeMemory({
          category: args.category || 'LEARNINGS',
          title: args.title,
          content: args.content,
          tags: Array.isArray(args.tags) ? args.tags : [],
          confidence: Number.isFinite(args.confidence) ? args.confidence : 95,
          source: `Tool: ${context.agentRole}`,
          dataSource: 'DEMO',
        });
        break;
      case 'calculateBusinessMetrics': {
        const state = storage.getSystemState();
        const metrics = state.metrics;
        const ltvCac = metrics.cac ? metrics.ltv / metrics.cac : null;
        result = {
          dataMode: storage.getDataMode(),
          mrr: metrics.mrr,
          projectedAnnualRunRate: metrics.mrr * 12,
          revenueGrowthPct: metrics.revenueGrowthPct,
          ltv: metrics.ltv,
          cac: metrics.cac,
          ltvCacRatio: ltvCac === null ? null : Number(ltvCac.toFixed(2)),
          healthScore: metrics.healthScore,
        };
        break;
      }
      case 'queryCrmLeads':
      case 'analyzeCompetitorMoves':
      case 'auditFunnelDropoff':
        result = {
          status: 'not_configured',
          dataMode: storage.getDataMode(),
          message: 'No hay conector de datos real instalado para esta herramienta. JARVIS no inventará resultados.',
          tool: toolId,
        };
        break;
      case 'executeAuthorizedAction': {
        const approved = storage.getProposals('approved').find((proposal: any) => proposal.id === args.proposalId);
        if (!approved) throw new Error('Proposal not found in approved state');
        result = storage.executeProposal(args.proposalId);
        break;
      }
      default:
        throw new Error(`Tool '${toolId}' is not implemented`);
    }

    const durationMs = Date.now() - startTime;
    storage.logAudit({
      user: context.user,
      agent: context.agentRole as any,
      action: `TOOL_EXECUTION_${toolId.toUpperCase()}`,
      tool: toolId,
      input: args,
      result: typeof result === 'object' ? JSON.stringify(result).slice(0, 500) : String(result),
      status: 'COMPLETED',
      durationMs,
    });

    return { success: true, tool: toolId, result, durationMs };
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    const message = error?.message || 'Unknown tool execution error';
    storage.logAudit({
      user: context.user,
      agent: context.agentRole as any,
      action: `TOOL_EXECUTION_FAILED_${toolId.toUpperCase()}`,
      tool: toolId,
      input: args,
      result: message,
      status: 'FAILED',
      error: message,
      durationMs,
    });
    return { success: false, tool: toolId, result: null, error: message, durationMs };
  }
}
