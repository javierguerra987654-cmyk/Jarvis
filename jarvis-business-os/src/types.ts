export type DataSourceType = 'REAL' | 'DEMO' | 'CALCULATED' | 'UNAVAILABLE';

export interface ToolParameterSchema {
  type: string;
  description: string;
  required?: boolean;
  enum?: string[];
}

export interface ToolDefinition {
  id: string;
  name: string;
  category: 'MEMORY' | 'ANALYTICS' | 'CRM' | 'SEARCH' | 'EXECUTION' | 'WORKSPACE' | 'SEO';
  description: string;
  riskLevel: RiskLevel;
  requiredPermission: PermissionLevel;
  parameters: Record<string, ToolParameterSchema>;
  isAutonomousSafe: boolean;
  requiresAuth?: boolean;
  readOnly?: boolean;
  associatedService?: 'gmail' | 'drive' | 'sheets' | 'calendar' | 'google_search' | string;
  requiredScopes?: string[];
}

export interface SystemHealthInfo {
  status: 'healthy' | 'degraded' | 'error';
  geminiConnected: boolean;
  geminiModel: string;
  geminiQuotaLimited?: boolean;
  geminiEngineStatus?: 'LIVE_API' | 'AUTONOMOUS_HEURISTIC_FALLBACK';
  serverUptimeSeconds: number;
  dataMode: 'REAL' | 'DEMO';
  memoryItemsCount: number;
  opportunitiesCount: number;
  proposalsCount: number;
  auditLogsCount: number;
  registeredToolsCount: number;
  lastHealthCheck: string;
}

export type AgentRole =
  | 'CORE'
  | 'MARKET_INTELLIGENCE'
  | 'SALES'
  | 'MARKETING'
  | 'CRO'
  | 'PRODUCT'
  | 'AUTOMATION'
  | 'RESEARCH'
  | 'EXECUTION';

export type PermissionLevel = 'READ' | 'ANALYZE' | 'EXECUTE';

export type AutonomyLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type OpportunityCategory =
  | 'sales'
  | 'marketing'
  | 'seo'
  | 'product'
  | 'automation'
  | 'cost_reduction'
  | 'retention'
  | 'conversion';

export type OpportunityStatus =
  | 'detected'
  | 'analyzing'
  | 'action_prepared'
  | 'executing'
  | 'completed'
  | 'dismissed';

export interface Opportunity {
  id: string;
  title: string;
  category: OpportunityCategory;
  estimatedImpact: string;
  confidence: number; // 0 - 100
  dataUsed: string[];
  reason: string;
  recommendedAction: string;
  actionProposalId?: string;
  status: OpportunityStatus;
  createdAt: string;
  assignedAgent: AgentRole;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dataSource?: DataSourceType;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ActionStatus =
  | 'PROPOSED'
  | 'APPROVED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REJECTED';

export interface ActionProposal {
  id: string;
  title: string;
  agent: AgentRole;
  category: string;
  actionType: string;
  reason: string;
  dataEvidence: string[];
  estimatedImpact: string;
  risk: RiskLevel;
  status: ActionStatus;
  payload: Record<string, any>;
  executionOutput?: string;
  proposedAt: string;
  decidedAt?: string;
  executedAt?: string;
  requiresAuth: boolean;
  opportunityId?: string;
  dataSource?: DataSourceType;
}

export type MemoryCategory =
  | 'OBJECTIVES'
  | 'PROJECTS'
  | 'DECISIONS'
  | 'METRICS'
  | 'CLIENTS'
  | 'PRODUCTS'
  | 'PROCESSES'
  | 'LEARNINGS';

export interface BusinessMemoryItem {
  id: string;
  category: MemoryCategory;
  title: string;
  content: string;
  tags: string[];
  source?: string;
  confidence?: number;
  createdAt: string;
  updatedAt: string;
  dataSource?: DataSourceType;
  createdBy?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  agent: AgentRole;
  action: string;
  tool: string;
  input: Record<string, any> | string;
  result?: string | Record<string, any>;
  status: ActionStatus;
  error?: string;
  durationMs?: number;
  userId?: string;
}


export interface AgentInfo {
  role: AgentRole;
  name: string;
  title: string;
  description: string;
  capabilities: string[];
  tools: string[];
  status: 'idle' | 'analyzing' | 'executing' | 'standby';
  currentTask?: string;
  avatarIcon: string;
  color: string;
}

export interface SystemMetrics {
  revenueMonthly: number;
  revenueGrowthPct: number;
  mrr: number;
  activeLeads: number;
  conversionRate: number;
  cac: number;
  ltv: number;
  churnRate: number;
  automatedHoursSaved: number;
  healthScore: number;
  dataSource?: DataSourceType;
}

export interface OAuth2Token {
  serviceId: 'gmail' | 'drive' | 'sheets' | 'calendar' | 'google_search';
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  issuedAt: number;
  expiresAt: number;
  refreshToken?: string;
  scopes: string[];
  accountEmail: string;
  readOnly: boolean;
}

export interface OAuth2AuthStatus {
  serviceId: 'gmail' | 'drive' | 'sheets' | 'calendar' | 'google_search';
  name: string;
  isAuthorized: boolean;
  token: OAuth2Token | null;
  expiresInSeconds: number;
  isExpired: boolean;
  expiresAtFormatted: string;
  lastSyncFormatted: string;
  requiredScopes: string[];
  accountEmail: string;
}

export interface WorkspaceIntegrationAuth {
  id: 'gmail' | 'drive' | 'sheets' | 'calendar' | 'google_search';
  name: string;
  category: string;
  status: 'connected' | 'authorized' | 'disconnected' | 'authorizing';
  isAuthorized: boolean;
  requiredScopes: string[];
  readOnly: boolean;
  lastSync?: string;
  tokenExpiresAt?: string;
  associatedTools: string[];
  accountEmail?: string;
}

export interface SystemState {
  autonomyLevel: AutonomyLevel;
  dataMode?: 'REAL' | 'DEMO';
  activeAgents: AgentInfo[];
  connectedIntegrations: {
    id: string;
    name: string;
    type: string;
    status: 'connected' | 'ready' | 'pending' | 'authorized' | 'disconnected';
    lastSync?: string;
    description: string;
    icon: string;
    isAuthorized?: boolean;
    readOnly?: boolean;
    requiredScopes?: string[];
  }[];
  metrics: SystemMetrics;
  stats: {
    totalOpps: number;
    pendingApprovals: number;
    executedActions: number;
    memoryCount: number;
    auditLogCount: number;
  };
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface CommandPlanStep {
  stepNumber: number;
  description: string;
  assignedAgent: AgentRole;
  tool: string;
  status: 'pending' | 'executing' | 'completed' | 'skipped';
}

export interface DataGatheredItem {
  source: string;
  details: string;
  type: 'fact' | 'estimation' | 'web_search' | 'memory' | 'metric' | 'workspace';
  url?: string;
}

export interface CommandExecutionResult {
  id: string;
  command: string;
  timestamp: string;
  plan: CommandPlanStep[];
  toolsUsed: string[];
  dataGathered: DataGatheredItem[];
  analysis: string;
  factsVsEstimations: {
    facts: string[];
    estimations: string[];
  };
  conclusions: string[];
  detectedOpportunities: Opportunity[];
  actionProposals: ActionProposal[];
  groundingSources?: GroundingSource[];
  learningsToStore?: string[];
  executionTimeMs: number;
}

export interface DocumentAnalysisResult {
  filename: string;
  fileSize: number;
  fileType: string;
  summary: string;
  keyMetrics: { label: string; value: string; trend?: 'up' | 'down' | 'neutral' }[];
  anomalies: string[];
  detectedOpportunities: Partial<Opportunity>[];
  proposedActions: Partial<ActionProposal>[];
  extractedInsights: string[];
  analyzedAt: string;
}

export type VoiceState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'ERROR' | 'OFFLINE';
export type VoiceConnectionState = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'ERROR';
export type ConversationRole = 'USER' | 'JARVIS' | 'SYSTEM';

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: ConversationRole;
  content: string;
  timestamp: string;
  audioBase64?: string;
  audioMimeType?: string;
  toolsUsed?: string[];
  groundingSources?: GroundingSource[];
  actionProposals?: ActionProposal[];
  detectedOpportunities?: Opportunity[];
  status?: 'sending' | 'thinking' | 'speaking' | 'streaming' | 'completed' | 'error';
  error?: string;
  isVoiceInput?: boolean;
}

export interface ConversationSession {
  conversationId: string;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface VoiceResponsePayload {
  conversationId: string;
  message: ConversationMessage;
  audioBase64?: string;
  audioMimeType?: string;
  groundingSources?: GroundingSource[];
  toolsUsed?: string[];
  actionProposals?: ActionProposal[];
  detectedOpportunities?: Opportunity[];
  voiceAvailable: boolean;
}

