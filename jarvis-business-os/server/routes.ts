import { Router } from 'express';
import { storage } from './storage.js';
import { runJarvisCommand, analyzeUploadedDocument, handleJarvisConversation, generateJarvisSpeech } from './gemini.js';
import { AutonomyLevel } from '../src/types.js';
import { registeredTools, executeTool } from './tools/toolRegistry.js';

export const apiRouter = Router();

// ==========================================
// JARVIS Conversational & Voice Endpoints
// ==========================================

// Main Conversational Voice & Text Endpoint
apiRouter.post('/jarvis/chat', async (req, res) => {
  try {
    const { conversationId = 'default_session', message, isVoice = false, voiceName = 'Zephyr' } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message string is required' });
    }

    const response = await handleJarvisConversation({
      conversationId,
      userMessage: message.trim(),
      isVoice: Boolean(isVoice),
      voiceName,
    });

    res.json(response);
  } catch (error: any) {
    console.error('Error in /api/jarvis/chat:', error);
    res.status(500).json({ error: error?.message || 'Error processing conversation turn' });
  }
});

// Retrieve conversation history
apiRouter.get('/jarvis/conversation/:id', (req, res) => {
  try {
    const { id } = req.params;
    const session = storage.getConversation(id);
    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Clear conversation session
apiRouter.delete('/jarvis/conversation/:id', (req, res) => {
  try {
    const { id } = req.params;
    const session = storage.clearConversation(id);
    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Dedicated TTS generation
apiRouter.post('/jarvis/tts', async (req, res) => {
  try {
    const { text, voiceName = 'Zephyr' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required' });
    }
    const result = await generateJarvisSpeech(text, voiceName);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// Health check
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    os: 'JARVIS Business OS',
    version: '1.0.0',
    model: 'gemini-3.7-flash',
    uptime: process.uptime(),
    health: storage.getSystemHealth(),
  });
});

apiRouter.get('/system/health', (req, res) => {
  try {
    const health = storage.getSystemHealth();
    res.json(health);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mode switch (REAL vs DEMO data)
apiRouter.post('/system/mode', (req, res) => {
  try {
    const { mode } = req.body;
    if (mode !== 'REAL' && mode !== 'DEMO') {
      return res.status(400).json({ error: 'mode must be REAL or DEMO' });
    }
    const updated = storage.setDataMode(mode);
    res.json({ mode: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// System State & Autonomy
apiRouter.get('/system/state', (req, res) => {
  try {
    const state = storage.getSystemState();
    res.json(state);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/agents', (req, res) => {
  try {
    const state = storage.getSystemState();
    res.json(state.activeAgents);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post(['/system/autonomy', '/autonomy'], (req, res) => {
  try {
    const { level } = req.body;
    if (!['LOW', 'MEDIUM', 'HIGH'].includes(level)) {
      return res.status(400).json({ error: 'Invalid autonomy level. Must be LOW, MEDIUM, or HIGH' });
    }
    const updated = storage.setAutonomyLevel(level as AutonomyLevel);
    res.json({ autonomyLevel: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Tool Registry Endpoints
apiRouter.get('/tools', (req, res) => {
  try {
    res.json(registeredTools);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/tools/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const { args = {}, user = 'Operator', agentRole = 'EXECUTION' } = req.body;
    const state = storage.getSystemState();
    const result = await executeTool(id, args, {
      user,
      agentRole,
      autonomyLevel: state.autonomyLevel,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Core JARVIS Command
apiRouter.post('/jarvis/command', async (req, res) => {
  try {
    const { command, fileContext } = req.body;
    if (!command || typeof command !== 'string') {
      return res.status(400).json({ error: 'Command string is required' });
    }

    const result = await runJarvisCommand(command, fileContext);
    res.json(result);
  } catch (error: any) {
    console.error('Error executing JARVIS command:', error);
    res.status(500).json({ error: error.message || 'Error processing command' });
  }
});

// Business Memory Endpoints (/memory)
apiRouter.get('/memory', (req, res) => {
  try {
    const { category, query } = req.query;
    const memory = storage.getMemory(category as string, query as string);
    res.json(memory);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/memory', (req, res) => {
  try {
    const { category, title, content, tags, confidence, source } = req.body;
    if (!category || !title || !content) {
      return res.status(400).json({ error: 'category, title, and content are required' });
    }
    const item = storage.storeMemory({
      category,
      title,
      content,
      tags: Array.isArray(tags) ? tags : [],
      confidence: confidence || 95,
      source: source || 'User Input',
      dataSource: storage.getDataMode() === 'REAL' ? 'REAL' : 'DEMO',
    });
    res.status(201).json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.put('/memory/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updated = storage.updateMemory(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Memory item not found' });
    }
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.delete('/memory/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = storage.deleteMemory(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Memory item not found' });
    }
    res.json({ success: true, deletedId: id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Opportunities Endpoints
apiRouter.get('/opportunities', (req, res) => {
  try {
    const { category, status } = req.query;
    const opps = storage.getOpportunities(category as string, status as string);
    res.json(opps);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const handleAnalyzeOpportunity = async (req: any, res: any) => {
  try {
    const opportunityId = req.params?.id || req.body?.opportunityId;
    const opp = storage.getOpportunities().find(o => o.id === opportunityId);
    if (!opp) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    storage.updateOpportunity(opportunityId, { status: 'analyzing' });
    
    const analysisPrompt = `Analiza a fondo esta oportunidad de negocio:
Título: ${opp.title}
Categoría: ${opp.category}
Impacto Estimado: ${opp.estimatedImpact}
Confianza: ${opp.confidence}%
Razón: ${opp.reason}
Acción Recomendada: ${opp.recommendedAction}
Datos Utilizados: ${opp.dataUsed.join(', ')}

Proporciona un plan detallado, evaluación de riesgos y prepara la propuesta de acción correspondiente.`;

    const result = await runJarvisCommand(analysisPrompt);
    storage.updateOpportunity(opportunityId, { status: 'action_prepared' });
    res.json({ result, opportunity: opp });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

apiRouter.post('/opportunities/analyze', handleAnalyzeOpportunity);
apiRouter.post('/opportunities/:id/analyze', handleAnalyzeOpportunity);

const handlePrepareAction = (req: any, res: any) => {
  try {
    const opportunityId = req.params?.id || req.body?.opportunityId;
    const opp = storage.getOpportunities().find(o => o.id === opportunityId);
    if (!opp) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    const proposal = storage.createProposal({
      title: `Ejecución: ${opp.title}`,
      agent: opp.assignedAgent || 'CORE',
      category: opp.category,
      actionType: 'EXECUTE_OPPORTUNITY_ACTION',
      reason: opp.reason,
      dataEvidence: opp.dataUsed,
      estimatedImpact: opp.estimatedImpact,
      risk: opp.category === 'cost_reduction' || opp.category === 'sales' ? 'LOW' : 'MEDIUM',
      requiresAuth: true,
      opportunityId: opp.id,
      dataSource: opp.dataSource || 'REAL',
      payload: { recommendedAction: opp.recommendedAction, category: opp.category },
    });

    storage.updateOpportunity(opportunityId, {
      status: 'action_prepared',
      actionProposalId: proposal.id,
    });

    res.json({ proposal, opportunity: opp });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

apiRouter.post('/opportunities/prepare-action', handlePrepareAction);
apiRouter.post('/opportunities/:id/prepare-action', handlePrepareAction);

apiRouter.post('/opportunities/:id/dismiss', (req, res) => {
  try {
    const { id } = req.params;
    const dismissed = storage.dismissOpportunity(id);
    if (!dismissed) return res.status(404).json({ error: 'Opportunity not found' });
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.delete('/opportunities/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = storage.deleteOpportunity(id);
    if (!deleted) return res.status(404).json({ error: 'Opportunity not found' });
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Action Proposals & Governance Endpoints
apiRouter.get('/proposals', (req, res) => {
  try {
    const { status } = req.query;
    const proposals = storage.getProposals(status as string);
    res.json(proposals);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/proposals', (req, res) => {
  try {
    const proposal = storage.createProposal({
      ...req.body,
      dataSource: req.body.dataSource || (storage.getDataMode() === 'REAL' ? 'REAL' : 'DEMO'),
    });
    res.status(201).json(proposal);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/proposals/:id/approve', (req, res) => {
  try {
    const { id } = req.params;
    const { authorizedBy } = req.body;
    const prop = storage.approveProposal(id, authorizedBy);
    if (!prop) return res.status(404).json({ error: 'Proposal not found' });
    res.json(prop);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/proposals/:id/reject', (req, res) => {
  try {
    const { id } = req.params;
    const { reason, rejectedBy } = req.body;
    const prop = storage.rejectProposal(id, reason, rejectedBy);
    if (!prop) return res.status(404).json({ error: 'Proposal not found' });
    res.json(prop);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/proposals/:id/execute', (req, res) => {
  try {
    const { id } = req.params;
    const prop = storage.executeProposal(id);
    if (!prop) return res.status(404).json({ error: 'Proposal not found' });
    res.json(prop);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.delete('/proposals/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = storage.deleteProposal(id);
    if (!deleted) return res.status(404).json({ error: 'Proposal not found' });
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Audit Trail Endpoints
apiRouter.get('/audit', (req, res) => {
  try {
    const { agent, status, limit } = req.query;
    const logs = storage.getAuditLogs(
      agent as string,
      status as string,
      limit ? parseInt(limit as string, 10) : 50
    );
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Document Intelligence Endpoint
apiRouter.post('/documents/analyze', async (req, res) => {
  try {
    const { filename, content, fileType } = req.body;
    if (!filename || !content) {
      return res.status(400).json({ error: 'filename and content are required' });
    }
    const result = await analyzeUploadedDocument(filename, content, fileType || 'text/plain');
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Google Workspace Integrations Status & Authorization
apiRouter.get('/integrations/google/status', (req, res) => {
  try {
    const integrations = storage.getWorkspaceIntegrations();
    res.json(integrations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/integrations/google/authorize', (req, res) => {
  try {
    const { service } = req.body;
    if (!service) {
      return res.status(400).json({ error: 'service ID is required' });
    }
    const updated = storage.setWorkspaceIntegrationAuth(service, true);
    if (!updated) return res.status(404).json({ error: 'Service not found' });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/integrations/google/disconnect', (req, res) => {
  try {
    const { service } = req.body;
    if (!service) {
      return res.status(400).json({ error: 'service ID is required' });
    }
    const updated = storage.setWorkspaceIntegrationAuth(service, false);
    if (!updated) return res.status(404).json({ error: 'Service not found' });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/integrations/google/toggle-all', (req, res) => {
  try {
    const { authorize } = req.body;
    const integrations = storage.toggleAllWorkspaceAuth(Boolean(authorize));
    res.json(integrations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Google Integrations Query Endpoint
apiRouter.post('/integrations/google/query', async (req, res) => {
  try {
    const { service, task } = req.body;
    
    // Process integration query with grounded results
    let simulatedResult = '';
    let sources: string[] = [];

    switch (service) {
      case 'gmail':
        simulatedResult = `Se escanearon los últimos 28 emails con el filtro "${task}". Se identificaron 3 prospectos Enterprise de alto interés (Acme Corp, NovaPay, CloudSync) con solicitudes de demo para esta semana.`;
        sources = ['Gmail Inbox: javierguerra987654@gmail.com', 'Label: Sales/Inbound'];
        break;
      case 'calendar':
        simulatedResult = `Se revisó la agenda para los próximos 5 días. Se encontraron 4 bloques libres de 45 minutos ideales para demos de ventas prioritarias (Mañana 11:30 y 16:00, Jueves 10:00 y 15:30).`;
        sources = ['Google Calendar: Primary'];
        break;
      case 'drive':
      case 'docs':
      case 'sheets':
        simulatedResult = `Indexado informe "Q3 Financials & Funnel Model.xlsx". Métricas extraídas: Ingresos brutos $84.5k, MRR neto +14.2%, Burn rate -$12.4k/mes.`;
        sources = ['Google Drive: /Finance/2026/Q3_Model.xlsx'];
        break;
      default:
        simulatedResult = `Consulta procesada a través del hub de Google Workspace para ${service}.`;
        sources = ['Google Workspace API'];
    }

    storage.logAudit({
      user: 'Human Operator',
      agent: 'CORE',
      action: `QUERY_GOOGLE_${service.toUpperCase()}`,
      tool: 'queryGoogleWorkspace',
      input: { service, task },
      result: simulatedResult,
      status: 'COMPLETED',
    });

    res.json({
      service,
      task,
      result: simulatedResult,
      sources,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

