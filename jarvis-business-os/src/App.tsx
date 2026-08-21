import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar.js';
import { Header } from './components/Header.js';
import { NeuralCommandOS } from './components/NeuralCommandOS.js';
import { GlobalHUDGrid } from './components/GlobalHUDGrid.js';
import { JarvisConversationView } from './components/JarvisConversationView.js';
import { CommandCenterView } from './components/CommandCenterView.js';
import { OpportunitiesView } from './components/OpportunitiesView.js';
import { ActionProposalsView } from './components/ActionProposalsView.js';
import { AgentFleetView } from './components/AgentFleetView.js';
import { BusinessMemoryView } from './components/BusinessMemoryView.js';
import { DocumentIntelligenceView } from './components/DocumentIntelligenceView.js';
import { ActivityAuditView } from './components/ActivityAuditView.js';
import { GoogleIntegrationsView } from './components/GoogleIntegrationsView.js';
import { SystemHealthView } from './components/SystemHealthView.js';
import {
  ActionProposal,
  AgentInfo,
  AgentRole,
  AuditLogEntry,
  AutonomyLevel,
  BusinessMemoryItem,
  CommandExecutionResult,
  DocumentAnalysisResult,
  MemoryCategory,
  Opportunity,
  SystemState,
} from './types.js';
import { dataProvider } from './lib/dataProvider.js';
import { useAuth } from './contexts/AuthContext.js';
import {
  saveMemoryToFirestore,
  deleteMemoryFromFirestore,
  saveOpportunityToFirestore,
  saveProposalToFirestore,
  recordAuditLogToFirestore,
} from './lib/firebase.js';

export function App() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<string>('neural_os');
  const [systemState, setSystemState] = useState<SystemState | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [proposals, setProposals] = useState<ActionProposal[]>([]);
  const [memoryItems, setMemoryItems] = useState<BusinessMemoryItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [lastExecutionResult, setLastExecutionResult] = useState<CommandExecutionResult | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const autonomyLevel: AutonomyLevel = systemState?.autonomyLevel || 'LOW';
  const operatorName = user ? (user.displayName || user.email || 'Human Operator') : 'Human Operator (Guest)';

  // Load all initial system telemetry via dataProvider
  const loadSystemData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [stateData, oppsData, propsData, memData, auditData, agentsData] = await Promise.all([
        dataProvider.getSystemState(),
        dataProvider.getOpportunities(),
        dataProvider.getProposals(),
        dataProvider.getMemory(),
        dataProvider.getAuditLogs(),
        dataProvider.getAgents(),
      ]);

      setSystemState(stateData);
      setOpportunities(oppsData);
      setProposals(propsData);
      setMemoryItems(memData);
      setAuditLogs(auditData);
      setAgents(agentsData);
    } catch (err: any) {
      console.error('Error fetching JARVIS system telemetry via DataProvider:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSystemData();
  }, [loadSystemData]);

  const triggerToast = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => {
      setErrorToast(null);
    }, 4000);
  };

  // Change autonomy level
  const handleAutonomyChange = async (level: AutonomyLevel) => {
    try {
      const res = await dataProvider.setAutonomyLevel(level);
      setSystemState((prev) => (prev ? { ...prev, autonomyLevel: res.autonomyLevel } : null));
      await loadSystemData();
    } catch (err) {
      triggerToast('Error actualizando nivel de autonomía');
    }
  };

  // Execute a command on JARVIS
  const handleExecuteCommand = async (command: string) => {
    setIsExecuting(true);
    try {
      const result = await dataProvider.runCommand(command);
      setLastExecutionResult(result);
      if (currentView !== 'command_center') {
        setCurrentView('command_center');
      }
      // Record audit in Firestore
      await recordAuditLogToFirestore({
        timestamp: new Date().toISOString(),
        user: operatorName,
        agent: 'CORE',
        action: 'EXECUTE_JARVIS_COMMAND',
        tool: 'runCommand',
        input: { command },
        result: `Command processed with ${result.plan.length} steps`,
        status: 'COMPLETED',
        durationMs: result.executionTimeMs,
        userId: user?.uid,
      });
      await loadSystemData();
    } catch (err: any) {
      console.error('Error running JARVIS command:', err);
      triggerToast(err.message || 'Error al procesar el comando');
    } finally {
      setIsExecuting(false);
    }
  };

  // Run a prompt directly on a specific agent
  const handleRunAgentPrompt = async (role: AgentRole, prompt: string) => {
    await handleExecuteCommand(prompt);
  };

  // Opportunity Actions
  const handleAnalyzeOpportunity = async (id: string) => {
    setIsExecuting(true);
    try {
      const res = await dataProvider.analyzeOpportunity(id);
      setLastExecutionResult(res.result);
      setCurrentView('command_center');
      if (res.opportunity) {
        await saveOpportunityToFirestore(res.opportunity);
      }
      await loadSystemData();
    } catch (err) {
      triggerToast('Error analizando oportunidad');
    } finally {
      setIsExecuting(false);
    }
  };

  const handlePrepareAction = async (id: string) => {
    setIsExecuting(true);
    try {
      const res = await dataProvider.prepareOpportunityAction(id);
      triggerToast(`Propuesta creada: "${res.proposal.title}"`);
      setCurrentView('action_proposals');
      if (res.proposal) {
        await saveProposalToFirestore(res.proposal);
      }
      await loadSystemData();
    } catch (err) {
      triggerToast('Error preparando propuesta de acción');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleDismissOpportunity = async (id: string) => {
    try {
      await dataProvider.dismissOpportunity(id);
      setOpportunities((prev) => prev.filter((o) => o.id !== id));
      await saveOpportunityToFirestore({ id, status: 'dismissed' });
      await loadSystemData();
    } catch (err) {
      triggerToast('Error descartando oportunidad');
    }
  };

  // Proposal Actions (HITL Governance)
  const handleApproveProposal = async (id: string) => {
    setIsExecuting(true);
    try {
      const updated = await dataProvider.approveProposal(id, operatorName);
      triggerToast(`Acción aprobada y ejecutada exitosamente`);
      if (updated) {
        await saveProposalToFirestore(updated);
      }
      await recordAuditLogToFirestore({
        timestamp: new Date().toISOString(),
        user: operatorName,
        agent: 'EXECUTION',
        action: 'APPROVE_ACTION_PROPOSAL',
        tool: 'approveProposal',
        input: { proposalId: id, authorizedBy: operatorName },
        result: `Proposal ${id} approved by ${operatorName}`,
        status: 'APPROVED',
        userId: user?.uid,
      });
      await loadSystemData();
    } catch (err) {
      triggerToast('Error aprobando propuesta');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRejectProposal = async (id: string) => {
    try {
      const updated = await dataProvider.rejectProposal(id, 'Rechazado por el operador humano', operatorName);
      if (updated) {
        await saveProposalToFirestore(updated);
      }
      await recordAuditLogToFirestore({
        timestamp: new Date().toISOString(),
        user: operatorName,
        agent: 'CORE',
        action: 'REJECT_ACTION_PROPOSAL',
        tool: 'rejectProposal',
        input: { proposalId: id, rejectedBy: operatorName },
        result: `Proposal ${id} rejected by ${operatorName}`,
        status: 'REJECTED',
        userId: user?.uid,
      });
      await loadSystemData();
    } catch (err) {
      triggerToast('Error rechazando propuesta');
    }
  };

  const handleExecuteProposal = async (id: string) => {
    setIsExecuting(true);
    try {
      const updated = await dataProvider.executeProposal(id);
      triggerToast('Ejecución completada con éxito');
      if (updated) {
        await saveProposalToFirestore(updated);
      }
      await loadSystemData();
    } catch (err) {
      triggerToast('Error ejecutando propuesta');
    } finally {
      setIsExecuting(false);
    }
  };

  // Memory Actions
  const handleStoreMemory = async (item: {
    category: MemoryCategory;
    title: string;
    content: string;
    tags: string[];
    confidence?: number;
  }) => {
    try {
      const created = await dataProvider.storeMemory(item);
      // Persist to Cloud Firestore
      await saveMemoryToFirestore({
        ...created,
        createdBy: operatorName,
      });
      await loadSystemData();
    } catch (err) {
      triggerToast('Error guardando en memoria');
    }
  };

  const handleUpdateMemory = async (id: string, updates: Partial<BusinessMemoryItem>) => {
    try {
      const updated = await dataProvider.updateMemory(id, updates);
      if (updated) {
        await saveMemoryToFirestore(updated);
      }
      await loadSystemData();
    } catch (err) {
      triggerToast('Error actualizando memoria');
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      await dataProvider.deleteMemory(id);
      await deleteMemoryFromFirestore(id);
      setMemoryItems((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      triggerToast('Error eliminando de memoria');
    }
  };

  // Document Intelligence
  const handleAnalyzeDocument = async (filename: string, content: string, fileType: string) => {
    try {
      const data = await dataProvider.analyzeDocument(filename, content, fileType);
      await recordAuditLogToFirestore({
        timestamp: new Date().toISOString(),
        user: operatorName,
        agent: 'RESEARCH',
        action: 'ANALYZE_DOCUMENT',
        tool: 'documentIntelligence',
        input: { filename, fileType },
        result: `Extracted ${data.extractedInsights.length} insights and ${data.detectedOpportunities.length} opportunities`,
        status: 'COMPLETED',
        userId: user?.uid,
      });
      await loadSystemData();
      return data;
    } catch (err: any) {
      triggerToast(err.message || 'Error en auditoría documental');
      return null;
    }
  };


  // View title helper
  const getViewTitle = () => {
    switch (currentView) {
      case 'conversation':
        return 'JARVIS Conversation (Voz & Texto)';
      case 'command_center':
        return 'JARVIS Command Center';
      case 'opportunities':
        return 'Radar de Oportunidades';
      case 'action_proposals':
        return 'Gobernanza & Aprobaciones';
      case 'agent_fleet':
        return 'Flota de Agentes Especializados';
      case 'business_memory':
        return 'Memoria Empresarial Persistente';
      case 'document_intelligence':
        return 'Auditoría de Documentos & Archivos';
      case 'activity_audit':
        return 'Log de Auditoría Inmutable';
      case 'google_integrations':
        return 'Google Search & Workspace';
      case 'system_health':
        return 'Salud del Sistema & Tool Registry';
      default:
        return 'JARVIS Business OS';
    }
  };

  const pendingApprovalsCount = proposals.filter((p) => p.status === 'PROPOSED').length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090b10] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200 relative">
      {/* Global Futuristic HUD Grid Overlay */}
      <GlobalHUDGrid />

      {/* Toast Notification */}
      {errorToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#161d2d] border border-cyan-500/50 text-cyan-200 text-xs font-mono px-4 py-3 rounded-lg shadow-2xl animate-fade-in flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          <span>{errorToast}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        autonomyLevel={autonomyLevel}
        pendingApprovalsCount={pendingApprovalsCount}
        opportunitiesCount={opportunities.length}
      />

      {/* Main OS Viewport */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {currentView === 'neural_os' || currentView === 'conversation' ? (
          <NeuralCommandOS
            systemState={systemState}
            opportunities={opportunities}
            proposals={proposals}
            memoryItems={memoryItems}
            auditLogs={auditLogs}
            agents={agents}
            lastExecutionResult={lastExecutionResult}
            onExecuteCommand={handleExecuteCommand}
            onAnalyzeOpportunity={handleAnalyzeOpportunity}
            onPrepareAction={handlePrepareAction}
            onApproveProposal={handleApproveProposal}
            onRejectProposal={handleRejectProposal}
            onNavigateToView={setCurrentView}
            autonomyLevel={autonomyLevel}
            onChangeAutonomy={handleAutonomyChange}
            onRefresh={loadSystemData}
            isLoading={isLoading}
            isExecuting={isExecuting}
          />
        ) : (
          <>
            {/* Top Header */}
            <Header
              systemState={systemState}
              autonomyLevel={autonomyLevel}
              onChangeAutonomy={handleAutonomyChange}
              onRefresh={loadSystemData}
              isLoading={isLoading}
              currentViewTitle={getViewTitle()}
              onNavigateToConversation={() => setCurrentView('neural_os')}
            />

            {/* Scrollable View Area */}
            <main className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-[#090b10] via-[#0b0e15] to-[#080a0f]">
              <div className="max-w-7xl mx-auto">
                {currentView === 'command_center' && (
                  <NeuralCommandOS
                    systemState={systemState}
                    opportunities={opportunities}
                    proposals={proposals}
                    memoryItems={memoryItems}
                    auditLogs={auditLogs}
                    agents={agents}
                    lastExecutionResult={lastExecutionResult}
                    onExecuteCommand={handleExecuteCommand}
                    onAnalyzeOpportunity={handleAnalyzeOpportunity}
                    onPrepareAction={handlePrepareAction}
                    onApproveProposal={handleApproveProposal}
                    onRejectProposal={handleRejectProposal}
                    onNavigateToView={setCurrentView}
                    autonomyLevel={autonomyLevel}
                    onChangeAutonomy={handleAutonomyChange}
                    onRefresh={loadSystemData}
                    isLoading={isLoading}
                    isExecuting={isExecuting}
                  />
                )}

                {currentView === 'opportunities' && (
                  <OpportunitiesView
                    opportunities={opportunities}
                    onAnalyzeOpportunity={handleAnalyzeOpportunity}
                    onPrepareAction={handlePrepareAction}
                    onDismissOpportunity={handleDismissOpportunity}
                    isAnalyzing={isExecuting}
                  />
                )}

                {currentView === 'action_proposals' && (
                  <ActionProposalsView
                    proposals={proposals}
                    onApproveProposal={handleApproveProposal}
                    onRejectProposal={handleRejectProposal}
                    onExecuteProposal={handleExecuteProposal}
                    isProcessing={isExecuting}
                  />
                )}

                {currentView === 'agent_fleet' && (
                  <AgentFleetView
                    agents={agents}
                    onRunAgentPrompt={handleRunAgentPrompt}
                    isExecuting={isExecuting}
                  />
                )}

                {currentView === 'business_memory' && (
                  <BusinessMemoryView
                    memoryItems={memoryItems}
                    onStoreMemory={handleStoreMemory}
                    onUpdateMemory={handleUpdateMemory}
                    onDeleteMemory={handleDeleteMemory}
                    isLoading={isLoading}
                  />
                )}

                {currentView === 'document_intelligence' && (
                  <DocumentIntelligenceView
                    onAnalyzeDocument={handleAnalyzeDocument}
                    isAnalyzing={isExecuting}
                  />
                )}

                {currentView === 'activity_audit' && (
                  <ActivityAuditView logs={auditLogs} isLoading={isLoading} />
                )}

                {currentView === 'google_integrations' && (
                  <GoogleIntegrationsView
                    onSearchGroundingTest={handleExecuteCommand}
                    isSearching={isExecuting}
                  />
                )}

                {currentView === 'system_health' && (
                  <SystemHealthView
                    onTriggerRefresh={loadSystemData}
                  />
                )}
              </div>
            </main>
          </>
        )}
      </div>
    </div>
  );
}

export default App;

