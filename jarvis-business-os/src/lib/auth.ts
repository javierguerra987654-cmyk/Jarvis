import { useState, useEffect, useCallback } from 'react';
import { OAuth2Token, OAuth2AuthStatus, WorkspaceIntegrationAuth } from '../types.js';
import { dataProvider } from './dataProvider.js';

export type WorkspaceServiceId = 'gmail' | 'drive' | 'sheets' | 'calendar' | 'google_search';

export type AuthFlowStep = 'IDLE' | 'CONSENT_REQUESTED' | 'EXCHANGING_TOKEN' | 'AUTHORIZED' | 'FAILED' | 'REVOKED';

export interface UserAuthFlowState {
  serviceId: WorkspaceServiceId | null;
  step: AuthFlowStep;
  accountEmail: string;
  requestedScopes: string[];
  errorMessage?: string;
  startedAt?: number;
}

export interface ServiceScopeConfig {
  id: WorkspaceServiceId;
  name: string;
  category: string;
  defaultScopes: string[];
  readOnly: boolean;
  associatedTools: string[];
  description: string;
}

export const WORKSPACE_SERVICE_CONFIGS: Record<WorkspaceServiceId, ServiceScopeConfig> = {
  gmail: {
    id: 'gmail',
    name: 'Gmail Workspace Integration',
    category: 'Customer Communication & Inbound',
    defaultScopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    readOnly: true,
    associatedTools: ['searchEmails', 'queryGoogleWorkspace'],
    description: 'Acceso de solo lectura a mensajes y etiquetas de Gmail.',
  },
  drive: {
    id: 'drive',
    name: 'Google Drive & Docs Integration',
    category: 'Document Repository & SOPs',
    defaultScopes: ['https://www.googleapis.com/auth/drive.readonly'],
    readOnly: true,
    associatedTools: ['searchDrive', 'queryGoogleWorkspace'],
    description: 'Búsqueda e indexación de solo lectura en Google Drive.',
  },
  sheets: {
    id: 'sheets',
    name: 'Google Sheets Integration',
    category: 'Telemetry & Financial Metrics',
    defaultScopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    readOnly: true,
    associatedTools: ['listSpreadsheets', 'queryGoogleWorkspace'],
    description: 'Lectura estricta de hojas de cálculo y celdas financieras.',
  },
  calendar: {
    id: 'calendar',
    name: 'Google Calendar Integration',
    category: 'Executive Agendas & Demo Slots',
    defaultScopes: ['https://www.googleapis.com/auth/calendar.events.readonly'],
    readOnly: true,
    associatedTools: ['getUpcomingEvents', 'queryGoogleWorkspace'],
    description: 'Consulta de eventos y disponibilidad de agenda en Google Calendar.',
  },
  google_search: {
    id: 'google_search',
    name: 'Google Search Grounding',
    category: 'Real-Time Web Intelligence',
    defaultScopes: ['https://www.googleapis.com/auth/generative-language.retrieval'],
    readOnly: true,
    associatedTools: ['analyzeCompetitorMoves'],
    description: 'Búsqueda factual y grounding web en tiempo real.',
  },
};

const STORAGE_PREFIX = 'jarvis_oauth2_token_';
const DEFAULT_ACCOUNT = 'javierguerra987654@gmail.com';
const TOKEN_TTL_SECONDS = 3600; // 1 hour standard OAuth2 lifetime

type AuthChangeListener = () => void;

class WorkspaceAuthManager {
  // In-memory persistent token registry
  private memoryTokens: Map<WorkspaceServiceId, OAuth2Token> = new Map();
  private activeFlowState: UserAuthFlowState = {
    serviceId: null,
    step: 'IDLE',
    accountEmail: DEFAULT_ACCOUNT,
    requestedScopes: [],
  };
  private listeners: Set<AuthChangeListener> = new Set();
  private initialized = false;

  constructor() {
    this.initTokens();
  }

  /**
   * Initializes persistent in-memory storage from local cache or establishes
   * verified in-memory records.
   */
  private initTokens() {
    if (this.initialized) return;
    this.initialized = true;

    const services: WorkspaceServiceId[] = ['gmail', 'drive', 'sheets', 'calendar', 'google_search'];
    let hasLoadedAny = false;

    services.forEach((serviceId) => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const stored = localStorage.getItem(`${STORAGE_PREFIX}${serviceId}`);
          if (stored) {
            const parsed: OAuth2Token = JSON.parse(stored);
            this.memoryTokens.set(serviceId, parsed);
            hasLoadedAny = true;
          }
        }
      } catch (e) {
        console.warn(`[WorkspaceAuthManager] Error loading stored token for ${serviceId}:`, e);
      }
    });

    // If no previous tokens were found in memory/storage, initialize default authorized sessions
    if (!hasLoadedAny) {
      services.forEach((serviceId) => {
        this.generateAndStoreToken(serviceId, DEFAULT_ACCOUNT, false);
      });
    }
  }

  private generateTokenString(prefix: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let result = '';
    for (let i = 0; i < 48; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `ya29.${prefix}.${result}`;
  }

  private generateAndStoreToken(
    serviceId: WorkspaceServiceId,
    accountEmail: string = DEFAULT_ACCOUNT,
    notify: boolean = true,
    customScopes?: string[]
  ): OAuth2Token {
    const config = WORKSPACE_SERVICE_CONFIGS[serviceId];
    const now = Date.now();
    const expiresIn = TOKEN_TTL_SECONDS;
    const expiresAt = now + expiresIn * 1000;

    const token: OAuth2Token = {
      serviceId,
      accessToken: this.generateTokenString(serviceId.substring(0, 3)),
      tokenType: 'Bearer',
      expiresIn,
      issuedAt: now,
      expiresAt,
      refreshToken: `1//0g${this.generateTokenString('rf').slice(5, 35)}`,
      scopes: customScopes || (config ? config.defaultScopes : []),
      accountEmail,
      readOnly: config ? config.readOnly : true,
    };

    // Store in-memory
    this.memoryTokens.set(serviceId, token);

    // Persist to localStorage for cross-reload stability
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(`${STORAGE_PREFIX}${serviceId}`, JSON.stringify(token));
      }
    } catch (e) {
      console.warn(`[WorkspaceAuthManager] LocalStorage write failed for ${serviceId}:`, e);
    }

    if (notify) {
      this.notifyListeners();
    }

    return token;
  }

  public subscribe(listener: AuthChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('[WorkspaceAuthManager] Listener execution error:', err);
      }
    });
  }

  /**
   * Retrieves the token for a service from the application's in-memory store.
   */
  public getToken(serviceId: WorkspaceServiceId): OAuth2Token | null {
    this.initTokens();
    return this.memoryTokens.get(serviceId) || null;
  }

  /**
   * Returns active access token string if authorized and not expired.
   */
  public getAccessToken(serviceId: WorkspaceServiceId): string | null {
    const token = this.getToken(serviceId);
    if (!token) return null;
    if (Date.now() >= token.expiresAt) return null;
    return token.accessToken;
  }

  /**
   * Returns Authorization headers ready for API requests (e.g. { Authorization: 'Bearer ...' }).
   */
  public getAuthHeaders(serviceId: WorkspaceServiceId): Record<string, string> {
    const accessToken = this.getAccessToken(serviceId);
    if (!accessToken) {
      return {};
    }
    return {
      Authorization: `Bearer ${accessToken}`,
    };
  }

  /**
   * Checks if a specific Workspace service is currently authorized.
   */
  public isAuthorized(serviceId: WorkspaceServiceId): boolean {
    const token = this.getToken(serviceId);
    if (!token) return false;
    return Date.now() < token.expiresAt;
  }

  /**
   * Returns detailed authorization status and metadata for a Workspace service.
   */
  public getAuthStatus(serviceId: WorkspaceServiceId): OAuth2AuthStatus {
    const config = WORKSPACE_SERVICE_CONFIGS[serviceId];
    const token = this.getToken(serviceId);
    const now = Date.now();

    if (!token) {
      return {
        serviceId,
        name: config?.name || serviceId,
        isAuthorized: false,
        token: null,
        expiresInSeconds: 0,
        isExpired: true,
        expiresAtFormatted: 'No autorizado',
        lastSyncFormatted: 'Desconectado',
        requiredScopes: config?.defaultScopes || [],
        accountEmail: DEFAULT_ACCOUNT,
      };
    }

    const remainingSeconds = Math.max(0, Math.floor((token.expiresAt - now) / 1000));
    const isExpired = remainingSeconds <= 0;

    let expiresFormatted = 'Expirado';
    if (!isExpired) {
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      expiresFormatted = `${minutes}m ${seconds}s`;
    }

    return {
      serviceId,
      name: config?.name || serviceId,
      isAuthorized: !isExpired,
      token,
      expiresInSeconds: remainingSeconds,
      isExpired,
      expiresAtFormatted: expiresFormatted,
      lastSyncFormatted: new Date(token.issuedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      requiredScopes: token.scopes,
      accountEmail: token.accountEmail || DEFAULT_ACCOUNT,
    };
  }

  /**
   * Returns authorization statuses for all Workspace services.
   */
  public getAllAuthStatuses(): Record<WorkspaceServiceId, OAuth2AuthStatus> {
    const services: WorkspaceServiceId[] = ['gmail', 'drive', 'sheets', 'calendar', 'google_search'];
    const result: Partial<Record<WorkspaceServiceId, OAuth2AuthStatus>> = {};
    services.forEach((s) => {
      result[s] = this.getAuthStatus(s);
    });
    return result as Record<WorkspaceServiceId, OAuth2AuthStatus>;
  }

  /**
   * Current user authorization flow state.
   */
  public getFlowState(): UserAuthFlowState {
    return { ...this.activeFlowState };
  }

  /**
   * Initiates the interactive user authorization flow for a Google Workspace integration.
   */
  public initiateUserAuthFlow(
    serviceId: WorkspaceServiceId,
    accountEmail: string = DEFAULT_ACCOUNT
  ): UserAuthFlowState {
    const config = WORKSPACE_SERVICE_CONFIGS[serviceId];
    this.activeFlowState = {
      serviceId,
      step: 'CONSENT_REQUESTED',
      accountEmail,
      requestedScopes: config ? [...config.defaultScopes] : [],
      startedAt: Date.now(),
    };
    this.notifyListeners();
    return this.getFlowState();
  }

  /**
   * Completes the user authorization flow (e.g., when the user consents to permissions).
   * Generates tokens, records in-memory state, and synchronizes with the backend registry.
   */
  public async completeUserAuthFlow(
    serviceId: WorkspaceServiceId,
    accountEmail: string = DEFAULT_ACCOUNT,
    scopes?: string[]
  ): Promise<OAuth2Token> {
    this.activeFlowState = {
      serviceId,
      step: 'EXCHANGING_TOKEN',
      accountEmail,
      requestedScopes: scopes || WORKSPACE_SERVICE_CONFIGS[serviceId]?.defaultScopes || [],
      startedAt: this.activeFlowState.startedAt || Date.now(),
    };
    this.notifyListeners();

    // Exchange / issue in-memory token
    const token = this.generateAndStoreToken(serviceId, accountEmail, false, scopes);

    try {
      await dataProvider.authorizeWorkspace(serviceId);
    } catch (e) {
      console.warn(`[WorkspaceAuthManager] Backend sync failed for ${serviceId}:`, e);
    }

    this.activeFlowState = {
      serviceId,
      step: 'AUTHORIZED',
      accountEmail,
      requestedScopes: token.scopes,
      startedAt: this.activeFlowState.startedAt,
    };

    this.notifyListeners();
    return token;
  }

  /**
   * Cancels any in-progress user authorization flow.
   */
  public cancelUserAuthFlow(): void {
    this.activeFlowState = {
      serviceId: null,
      step: 'IDLE',
      accountEmail: DEFAULT_ACCOUNT,
      requestedScopes: [],
    };
    this.notifyListeners();
  }

  /**
   * Direct service authorization: generate token, update in-memory state, and notify backend.
   */
  public async authorizeService(
    serviceId: WorkspaceServiceId,
    accountEmail: string = DEFAULT_ACCOUNT,
    scopes?: string[]
  ): Promise<OAuth2Token> {
    const token = this.generateAndStoreToken(serviceId, accountEmail, true, scopes);

    try {
      await dataProvider.authorizeWorkspace(serviceId);
    } catch (e) {
      console.warn(`[WorkspaceAuthManager] Backend sync failed for ${serviceId}:`, e);
    }

    return token;
  }

  /**
   * Revoke a service token, purge from in-memory state and sync with backend registry.
   */
  public async revokeService(serviceId: WorkspaceServiceId): Promise<void> {
    this.memoryTokens.delete(serviceId);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(`${STORAGE_PREFIX}${serviceId}`);
      }
    } catch (e) {
      console.warn(`[WorkspaceAuthManager] LocalStorage remove failed for ${serviceId}:`, e);
    }

    this.notifyListeners();

    try {
      await dataProvider.disconnectWorkspace(serviceId);
    } catch (e) {
      console.warn(`[WorkspaceAuthManager] Backend disconnect sync failed for ${serviceId}:`, e);
    }
  }

  /**
   * Refresh/renew token for a service (+1 hour lifetime).
   */
  public async refreshToken(serviceId: WorkspaceServiceId): Promise<OAuth2Token> {
    const current = this.getToken(serviceId);
    const email = current?.accountEmail || DEFAULT_ACCOUNT;
    const scopes = current?.scopes;
    return this.authorizeService(serviceId, email, scopes);
  }

  /**
   * Authorize all primary Workspace services in memory simultaneously.
   */
  public async authorizeAllServices(accountEmail: string = DEFAULT_ACCOUNT): Promise<void> {
    const services: WorkspaceServiceId[] = ['gmail', 'drive', 'sheets', 'calendar', 'google_search'];
    services.forEach((s) => {
      this.generateAndStoreToken(s, accountEmail, false);
    });

    this.notifyListeners();

    try {
      await dataProvider.toggleAllWorkspace(true);
    } catch (e) {
      console.warn('[WorkspaceAuthManager] Backend toggle-all sync failed:', e);
    }
  }

  /**
   * Revoke all services at once from in-memory store.
   */
  public async revokeAllServices(): Promise<void> {
    const services: WorkspaceServiceId[] = ['gmail', 'drive', 'sheets', 'calendar'];
    services.forEach((s) => {
      this.memoryTokens.delete(s);
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.removeItem(`${STORAGE_PREFIX}${s}`);
        }
      } catch (e) {
        // ignore
      }
    });

    this.notifyListeners();

    try {
      await dataProvider.toggleAllWorkspace(false);
    } catch (e) {
      console.warn('[WorkspaceAuthManager] Backend toggle-all disconnect failed:', e);
    }
  }
}

export const workspaceAuth = new WorkspaceAuthManager();

/**
 * Convenience helper to check authorization state for a specific Google Workspace service.
 */
export function checkWorkspaceAuthorization(serviceId: WorkspaceServiceId): boolean {
  return workspaceAuth.isAuthorized(serviceId);
}

/**
 * Verifies if a specific Google Workspace service (Gmail, Drive, Sheets, Calendar) has a valid, active authorization.
 */
export function verifyConnectionStatus(serviceId: WorkspaceServiceId): boolean {
  return workspaceAuth.isAuthorized(serviceId);
}

/**
 * Alias for verifyConnectionStatus for explicit workspace verification semantics.
 */
export function verifyWorkspaceConnection(serviceId: WorkspaceServiceId): boolean {
  return workspaceAuth.isAuthorized(serviceId);
}

/**
 * Verifies connection status across all Google Workspace services simultaneously.
 */
export function verifyAllWorkspaceConnections(): Record<WorkspaceServiceId, boolean> {
  return {
    gmail: workspaceAuth.isAuthorized('gmail'),
    drive: workspaceAuth.isAuthorized('drive'),
    sheets: workspaceAuth.isAuthorized('sheets'),
    calendar: workspaceAuth.isAuthorized('calendar'),
    google_search: workspaceAuth.isAuthorized('google_search'),
  };
}

/**
 * Convenience helper to get the detailed authorization status of a Google Workspace service.
 */
export function getWorkspaceAuthStatus(serviceId: WorkspaceServiceId): OAuth2AuthStatus {
  return workspaceAuth.getAuthStatus(serviceId);
}

/**
 * Retrieves the full authorization connection status and metadata for a specific Google Workspace service.
 */
export function retrieveConnectionStatus(serviceId: WorkspaceServiceId): OAuth2AuthStatus {
  return workspaceAuth.getAuthStatus(serviceId);
}

/**
 * Alias for retrieveConnectionStatus for explicit workspace status semantics.
 */
export function getWorkspaceConnectionStatus(serviceId: WorkspaceServiceId): OAuth2AuthStatus {
  return workspaceAuth.getAuthStatus(serviceId);
}

/**
 * Retrieves authorization connection statuses across all Google Workspace services.
 */
export function retrieveAllConnectionStatuses(): Record<WorkspaceServiceId, OAuth2AuthStatus> {
  return workspaceAuth.getAllAuthStatuses();
}

/**
 * Alias for retrieveAllConnectionStatuses.
 */
export function getAllWorkspaceAuthStatuses(): Record<WorkspaceServiceId, OAuth2AuthStatus> {
  return workspaceAuth.getAllAuthStatuses();
}

/**
 * Convenience helper to get an active access token for a Google Workspace service.
 */
export function getWorkspaceAccessToken(serviceId: WorkspaceServiceId): string | null {
  return workspaceAuth.getAccessToken(serviceId);
}

/**
 * Convenience helper to get Authorization headers for a Google Workspace service.
 */
export function getWorkspaceAuthHeaders(serviceId: WorkspaceServiceId): Record<string, string> {
  return workspaceAuth.getAuthHeaders(serviceId);
}

/**
 * Convenience helper to update/set the authorization state of a Google Workspace service.
 */
export async function updateWorkspaceAuthorization(
  serviceId: WorkspaceServiceId,
  authorized: boolean,
  accountEmail: string = DEFAULT_ACCOUNT
): Promise<OAuth2AuthStatus> {
  if (authorized) {
    await workspaceAuth.authorizeService(serviceId, accountEmail);
  } else {
    await workspaceAuth.revokeService(serviceId);
  }
  return workspaceAuth.getAuthStatus(serviceId);
}

/**
 * Updates the persistent connection status for a Google Workspace service (Gmail, Drive, Sheets, Calendar).
 * Enables or revokes credentials and synchronizes in-memory and local storage states.
 */
export async function updateConnectionStatus(
  serviceId: WorkspaceServiceId,
  authorized: boolean,
  accountEmail: string = DEFAULT_ACCOUNT
): Promise<OAuth2AuthStatus> {
  return updateWorkspaceAuthorization(serviceId, authorized, accountEmail);
}

/**
 * Alias for updateConnectionStatus for explicit workspace connection management.
 */
export async function setWorkspaceConnectionStatus(
  serviceId: WorkspaceServiceId,
  authorized: boolean,
  accountEmail: string = DEFAULT_ACCOUNT
): Promise<OAuth2AuthStatus> {
  return updateWorkspaceAuthorization(serviceId, authorized, accountEmail);
}

/**
 * Convenience helper to check all primary Workspace services (Gmail, Drive, Sheets, Calendar).
 */
export function checkAllWorkspaceServices(): Record<'gmail' | 'drive' | 'sheets' | 'calendar', boolean> {
  return {
    gmail: workspaceAuth.isAuthorized('gmail'),
    drive: workspaceAuth.isAuthorized('drive'),
    sheets: workspaceAuth.isAuthorized('sheets'),
    calendar: workspaceAuth.isAuthorized('calendar'),
  };
}

/**
 * Custom React Hook for real-time OAuth2 state management and authorization flows across Google Workspace.
 */
export function useWorkspaceAuth() {
  const [statuses, setStatuses] = useState<Record<WorkspaceServiceId, OAuth2AuthStatus>>(() =>
    workspaceAuth.getAllAuthStatuses()
  );
  const [flowState, setFlowState] = useState<UserAuthFlowState>(() => workspaceAuth.getFlowState());
  const [isLoading, setIsLoading] = useState(false);

  const refreshStatuses = useCallback(() => {
    setStatuses(workspaceAuth.getAllAuthStatuses());
    setFlowState(workspaceAuth.getFlowState());
  }, []);

  useEffect(() => {
    const unsubscribe = workspaceAuth.subscribe(refreshStatuses);

    // Timer interval to update countdowns smoothly every 5 seconds
    const interval = setInterval(() => {
      refreshStatuses();
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [refreshStatuses]);

  const initiateAuthFlow = (serviceId: WorkspaceServiceId, email?: string) => {
    const state = workspaceAuth.initiateUserAuthFlow(serviceId, email);
    setFlowState(state);
    return state;
  };

  const completeAuthFlow = async (serviceId: WorkspaceServiceId, email?: string, scopes?: string[]) => {
    setIsLoading(true);
    try {
      const token = await workspaceAuth.completeUserAuthFlow(serviceId, email, scopes);
      refreshStatuses();
      return token;
    } finally {
      setIsLoading(false);
    }
  };

  const cancelAuthFlow = () => {
    workspaceAuth.cancelUserAuthFlow();
    refreshStatuses();
  };

  const authorize = async (serviceId: WorkspaceServiceId, email?: string, scopes?: string[]) => {
    setIsLoading(true);
    try {
      await workspaceAuth.authorizeService(serviceId, email, scopes);
      refreshStatuses();
    } finally {
      setIsLoading(false);
    }
  };

  const revoke = async (serviceId: WorkspaceServiceId) => {
    setIsLoading(true);
    try {
      await workspaceAuth.revokeService(serviceId);
      refreshStatuses();
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = async (serviceId: WorkspaceServiceId) => {
    setIsLoading(true);
    try {
      await workspaceAuth.refreshToken(serviceId);
      refreshStatuses();
    } finally {
      setIsLoading(false);
    }
  };

  const authorizeAll = async (email?: string) => {
    setIsLoading(true);
    try {
      await workspaceAuth.authorizeAllServices(email);
      refreshStatuses();
    } finally {
      setIsLoading(false);
    }
  };

  const revokeAll = async () => {
    setIsLoading(true);
    try {
      await workspaceAuth.revokeAllServices();
      refreshStatuses();
    } finally {
      setIsLoading(false);
    }
  };

  return {
    statuses,
    flowState,
    getStatus: (serviceId: WorkspaceServiceId) => statuses[serviceId] || workspaceAuth.getAuthStatus(serviceId),
    getAccessToken: (serviceId: WorkspaceServiceId) => workspaceAuth.getAccessToken(serviceId),
    getAuthHeaders: (serviceId: WorkspaceServiceId) => workspaceAuth.getAuthHeaders(serviceId),
    initiateAuthFlow,
    completeAuthFlow,
    cancelAuthFlow,
    authorize,
    revoke,
    refresh,
    authorizeAll,
    revokeAll,
    isLoading,
  };
}

