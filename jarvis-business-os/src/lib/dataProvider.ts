import {
  ActionProposal,
  AgentInfo,
  AuditLogEntry,
  AutonomyLevel,
  BusinessMemoryItem,
  CommandExecutionResult,
  DocumentAnalysisResult,
  Opportunity,
  SystemHealthInfo,
  SystemState,
  ToolDefinition,
  WorkspaceIntegrationAuth,
} from '../types';

export interface DataProvider {
  // System State & Health
  getSystemState(): Promise<SystemState>;
  getSystemHealth(): Promise<SystemHealthInfo>;
  setAutonomyLevel(level: AutonomyLevel): Promise<{ autonomyLevel: AutonomyLevel }>;
  setDataMode(mode: 'REAL' | 'DEMO'): Promise<{ mode: 'REAL' | 'DEMO' }>;
  getAgents(): Promise<AgentInfo[]>;

  // Core Command
  runCommand(command: string, fileContext?: string): Promise<CommandExecutionResult>;

  // Opportunities
  getOpportunities(category?: string, status?: string): Promise<Opportunity[]>;
  analyzeOpportunity(id: string): Promise<{ result: CommandExecutionResult; opportunity: Opportunity }>;
  prepareOpportunityAction(id: string): Promise<{ proposal: ActionProposal; opportunity: Opportunity }>;
  dismissOpportunity(id: string): Promise<{ success: boolean; id: string }>;
  deleteOpportunity(id: string): Promise<{ success: boolean; id: string }>;

  // Action Proposals & Governance
  getProposals(status?: string): Promise<ActionProposal[]>;
  createProposal(prop: Partial<ActionProposal>): Promise<ActionProposal>;
  approveProposal(id: string, authorizedBy?: string): Promise<ActionProposal>;
  rejectProposal(id: string, reason?: string, rejectedBy?: string): Promise<ActionProposal>;
  executeProposal(id: string): Promise<ActionProposal>;
  deleteProposal(id: string): Promise<{ success: boolean; id: string }>;

  // Business Memory
  getMemory(category?: string, query?: string): Promise<BusinessMemoryItem[]>;
  storeMemory(item: Omit<BusinessMemoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<BusinessMemoryItem>;
  updateMemory(id: string, updates: Partial<BusinessMemoryItem>): Promise<BusinessMemoryItem>;
  deleteMemory(id: string): Promise<{ success: boolean; deletedId: string }>;

  // Audit Logs
  getAuditLogs(agent?: string, status?: string, limit?: number): Promise<AuditLogEntry[]>;

  // Document Intelligence
  analyzeDocument(filename: string, content: string, fileType?: string): Promise<DocumentAnalysisResult>;

  // Google Workspace Integrations
  getWorkspaceIntegrations(): Promise<WorkspaceIntegrationAuth[]>;
  authorizeWorkspace(service: string): Promise<WorkspaceIntegrationAuth>;
  disconnectWorkspace(service: string): Promise<WorkspaceIntegrationAuth>;
  toggleAllWorkspace(authorize: boolean): Promise<WorkspaceIntegrationAuth[]>;
  queryGoogleWorkspace(service: string, task: string): Promise<{ service: string; task: string; result: string; sources: string[]; timestamp: string }>;

  // Tool Registry
  getTools(): Promise<ToolDefinition[]>;
  executeTool(toolId: string, args?: Record<string, any>): Promise<{ success: boolean; tool: string; result: any; durationMs: number; error?: string }>;
}

class HttpDataProvider implements DataProvider {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          ...(options?.headers || {}),
        },
        ...options,
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errData = await response.json();
          if (errData?.error) errorMessage = errData.error;
        } catch {
          // ignore parse error
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (err: any) {
      console.error(`DataProvider request failed on ${endpoint}:`, err);
      throw err;
    }
  }

  // System State & Health
  async getSystemState(): Promise<SystemState> {
    return this.request<SystemState>('/api/system/state');
  }

  async getSystemHealth(): Promise<SystemHealthInfo> {
    return this.request<SystemHealthInfo>('/api/system/health');
  }

  async setAutonomyLevel(level: AutonomyLevel): Promise<{ autonomyLevel: AutonomyLevel }> {
    return this.request<{ autonomyLevel: AutonomyLevel }>('/api/system/autonomy', {
      method: 'POST',
      body: JSON.stringify({ level }),
    });
  }

  async setDataMode(mode: 'REAL' | 'DEMO'): Promise<{ mode: 'REAL' | 'DEMO' }> {
    return this.request<{ mode: 'REAL' | 'DEMO' }>('/api/system/mode', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
  }

  async getAgents(): Promise<AgentInfo[]> {
    return this.request<AgentInfo[]>('/api/agents');
  }

  // Core Command
  async runCommand(command: string, fileContext?: string): Promise<CommandExecutionResult> {
    return this.request<CommandExecutionResult>('/api/jarvis/command', {
      method: 'POST',
      body: JSON.stringify({ command, fileContext }),
    });
  }

  // Opportunities
  async getOpportunities(category?: string, status?: string): Promise<Opportunity[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (status) params.append('status', status);
    const qs = params.toString();
    return this.request<Opportunity[]>(`/api/opportunities${qs ? `?${qs}` : ''}`);
  }

  async analyzeOpportunity(id: string): Promise<{ result: CommandExecutionResult; opportunity: Opportunity }> {
    return this.request<{ result: CommandExecutionResult; opportunity: Opportunity }>(`/api/opportunities/${id}/analyze`, {
      method: 'POST',
      body: JSON.stringify({ opportunityId: id }),
    });
  }

  async prepareOpportunityAction(id: string): Promise<{ proposal: ActionProposal; opportunity: Opportunity }> {
    return this.request<{ proposal: ActionProposal; opportunity: Opportunity }>(`/api/opportunities/${id}/prepare-action`, {
      method: 'POST',
      body: JSON.stringify({ opportunityId: id }),
    });
  }

  async dismissOpportunity(id: string): Promise<{ success: boolean; id: string }> {
    return this.request<{ success: boolean; id: string }>(`/api/opportunities/${id}/dismiss`, {
      method: 'POST',
    });
  }

  async deleteOpportunity(id: string): Promise<{ success: boolean; id: string }> {
    return this.request<{ success: boolean; id: string }>(`/api/opportunities/${id}`, {
      method: 'DELETE',
    });
  }

  // Action Proposals & Governance
  async getProposals(status?: string): Promise<ActionProposal[]> {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request<ActionProposal[]>(`/api/proposals${qs}`);
  }

  async createProposal(prop: Partial<ActionProposal>): Promise<ActionProposal> {
    return this.request<ActionProposal>('/api/proposals', {
      method: 'POST',
      body: JSON.stringify(prop),
    });
  }

  async approveProposal(id: string, authorizedBy = 'Operator'): Promise<ActionProposal> {
    return this.request<ActionProposal>(`/api/proposals/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ authorizedBy }),
    });
  }

  async rejectProposal(id: string, reason = 'Rechazado por operador', rejectedBy = 'Operator'): Promise<ActionProposal> {
    return this.request<ActionProposal>(`/api/proposals/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason, rejectedBy }),
    });
  }

  async executeProposal(id: string): Promise<ActionProposal> {
    return this.request<ActionProposal>(`/api/proposals/${id}/execute`, {
      method: 'POST',
    });
  }

  async deleteProposal(id: string): Promise<{ success: boolean; id: string }> {
    return this.request<{ success: boolean; id: string }>(`/api/proposals/${id}`, {
      method: 'DELETE',
    });
  }

  // Business Memory
  async getMemory(category?: string, query?: string): Promise<BusinessMemoryItem[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (query) params.append('query', query);
    const qs = params.toString();
    return this.request<BusinessMemoryItem[]>(`/api/memory${qs ? `?${qs}` : ''}`);
  }

  async storeMemory(item: Omit<BusinessMemoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<BusinessMemoryItem> {
    return this.request<BusinessMemoryItem>('/api/memory', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  async updateMemory(id: string, updates: Partial<BusinessMemoryItem>): Promise<BusinessMemoryItem> {
    return this.request<BusinessMemoryItem>(`/api/memory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteMemory(id: string): Promise<{ success: boolean; deletedId: string }> {
    return this.request<{ success: boolean; deletedId: string }>(`/api/memory/${id}`, {
      method: 'DELETE',
    });
  }

  // Audit Logs
  async getAuditLogs(agent?: string, status?: string, limit = 50): Promise<AuditLogEntry[]> {
    const params = new URLSearchParams();
    if (agent) params.append('agent', agent);
    if (status) params.append('status', status);
    if (limit) params.append('limit', String(limit));
    const qs = params.toString();
    return this.request<AuditLogEntry[]>(`/api/audit${qs ? `?${qs}` : ''}`);
  }

  // Document Intelligence
  async analyzeDocument(filename: string, content: string, fileType = 'text/plain'): Promise<DocumentAnalysisResult> {
    return this.request<DocumentAnalysisResult>('/api/documents/analyze', {
      method: 'POST',
      body: JSON.stringify({ filename, content, fileType }),
    });
  }

  // Google Workspace Integrations
  async getWorkspaceIntegrations(): Promise<WorkspaceIntegrationAuth[]> {
    return this.request<WorkspaceIntegrationAuth[]>('/api/integrations/google/status');
  }

  async authorizeWorkspace(service: string): Promise<WorkspaceIntegrationAuth> {
    return this.request<WorkspaceIntegrationAuth>('/api/integrations/google/authorize', {
      method: 'POST',
      body: JSON.stringify({ service }),
    });
  }

  async disconnectWorkspace(service: string): Promise<WorkspaceIntegrationAuth> {
    return this.request<WorkspaceIntegrationAuth>('/api/integrations/google/disconnect', {
      method: 'POST',
      body: JSON.stringify({ service }),
    });
  }

  async toggleAllWorkspace(authorize: boolean): Promise<WorkspaceIntegrationAuth[]> {
    return this.request<WorkspaceIntegrationAuth[]>('/api/integrations/google/toggle-all', {
      method: 'POST',
      body: JSON.stringify({ authorize }),
    });
  }

  async queryGoogleWorkspace(service: string, task: string): Promise<{ service: string; task: string; result: string; sources: string[]; timestamp: string }> {
    return this.request<{ service: string; task: string; result: string; sources: string[]; timestamp: string }>('/api/integrations/google/query', {
      method: 'POST',
      body: JSON.stringify({ service, task }),
    });
  }

  // Tool Registry
  async getTools(): Promise<ToolDefinition[]> {
    return this.request<ToolDefinition[]>('/api/tools');
  }

  async executeTool(toolId: string, args: Record<string, any> = {}): Promise<{ success: boolean; tool: string; result: any; durationMs: number; error?: string }> {
    return this.request<{ success: boolean; tool: string; result: any; durationMs: number; error?: string }>(`/api/tools/${toolId}/execute`, {
      method: 'POST',
      body: JSON.stringify({ args }),
    });
  }
}

export const dataProvider: DataProvider = new HttpDataProvider();
