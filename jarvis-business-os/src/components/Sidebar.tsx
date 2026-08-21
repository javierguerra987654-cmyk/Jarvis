import React from 'react';
import {
  Radio,
  LayoutDashboard,
  Sparkles,
  ShieldCheck,
  Bot,
  Database,
  FileText,
  Activity,
  Globe,
  Cpu,
  ChevronRight,
  LogIn,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { AutonomyLevel } from '../types.js';
import { useAuth } from '../contexts/AuthContext.js';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  autonomyLevel: AutonomyLevel;
  pendingApprovalsCount: number;
  opportunitiesCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  autonomyLevel,
  pendingApprovalsCount,
  opportunitiesCount,
}) => {
  const { user, profile, signIn, signOut, loading: authLoading } = useAuth();

  const navItems = [
    {
      id: 'neural_os',
      label: 'NEURAL OS',
      icon: Radio,
      badge: 'LIVE',
      badgeColor: 'bg-[#00d5ff]/15 text-[#00d5ff] border border-[#00d5ff]/30',
      description: 'Holographic Neural Command OS',
    },
    {
      id: 'opportunities',
      label: 'Opportunities',
      icon: Sparkles,
      badge: opportunitiesCount > 0 ? `${opportunitiesCount}` : null,
      badgeColor: 'bg-[#00d5ff]/15 text-[#00d5ff] border border-[#00d5ff]/30',
      description: 'Radar de Oportunidades',
    },
    {
      id: 'action_proposals',
      label: 'Actions',
      icon: ShieldCheck,
      badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount}` : null,
      badgeColor: 'bg-[#ffb84d]/15 text-[#ffb84d] border border-[#ffb84d]/30 animate-pulse',
      description: 'Gobernanza Human-in-the-Loop',
    },
    {
      id: 'agent_fleet',
      label: 'Agents',
      icon: Bot,
      badge: '9 FLEET',
      badgeColor: 'bg-[#35d07f]/15 text-[#35d07f] border border-[#35d07f]/30',
      description: 'Flota de Agentes Especializados',
    },
    {
      id: 'business_memory',
      label: 'Memory',
      icon: Database,
      badge: null,
      description: 'Memoria Empresarial Persistente',
    },
    {
      id: 'document_intelligence',
      label: 'Documents',
      icon: FileText,
      badge: null,
      description: 'Auditoría & Análisis Documental',
    },
    {
      id: 'activity_audit',
      label: 'Activity',
      icon: Activity,
      badge: null,
      description: 'Log de Auditoría Inmutable',
    },
    {
      id: 'google_integrations',
      label: 'Google Workspace',
      icon: Globe,
      badge: 'GSUITE',
      badgeColor: 'bg-[#6575ff]/15 text-[#6575ff] border border-[#6575ff]/30',
      description: 'Connected Sources & OAuth Hub',
    },
    {
      id: 'system_health',
      label: 'System',
      icon: Cpu,
      badge: null,
      description: 'Salud del Sistema & Tool Registry',
    },
  ];

  return (
    <>
      {/* Desktop & Tablet Sidebar */}
      <aside
        id="sidebar_navigation"
        aria-label="Navegación Principal de JARVIS"
        className="hidden md:flex md:w-64 lg:w-68 bg-[#0b1016] border-r border-[#16202c] flex-col h-screen select-none shrink-0"
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-[#16202c] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00d5ff]/10 border border-[#00d5ff]/30 flex items-center justify-center text-[#00d5ff] shadow-sm">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wider text-[#f5f7fa] font-mono">
                  JARVIS
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#05070a] text-[#00d5ff] font-mono border border-[#16202c]">
                  OS v1.0
                </span>
              </div>
              <p className="text-[10px] text-[#8b97a5] font-mono">
                Intelligence OS
              </p>
            </div>
          </div>
        </div>

        {/* System Core Online Strip */}
        <div className="px-4 py-2.5 bg-[#05070a] border-b border-[#16202c] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#35d07f] animate-pulse" />
            <span className="text-[11px] text-[#8b97a5] font-mono font-medium">CORE ONLINE</span>
          </div>
          <span
            className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
              autonomyLevel === 'HIGH'
                ? 'bg-purple-950/60 text-purple-300 border border-purple-800'
                : autonomyLevel === 'MEDIUM'
                ? 'bg-cyan-950/60 text-[#00d5ff] border border-cyan-800'
                : 'bg-emerald-950/60 text-[#35d07f] border border-emerald-800'
            }`}
          >
            {autonomyLevel} AUTONOMY
          </span>
        </div>

        {/* Navigation Item List */}
        <nav className="flex-1 overflow-y-auto p-2.5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = currentView === item.id;
            return (
              <button
                key={item.id}
                id={`nav_btn_${item.id}`}
                onClick={() => onSelectView(item.id)}
                aria-current={isSelected ? 'page' : undefined}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group cursor-pointer ${
                  isSelected
                    ? 'bg-[#111820] text-[#00d5ff] border border-[#00d5ff]/30 shadow-sm'
                    : 'text-[#8b97a5] hover:text-[#f5f7fa] hover:bg-[#111820]/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isSelected
                        ? 'text-[#00d5ff]'
                        : 'text-[#8b97a5] group-hover:text-[#f5f7fa]'
                    }`}
                  />
                  <span className="truncate font-sans">{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {item.badge && (
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        item.badgeColor || 'bg-[#111820] text-[#8b97a5]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-transform ${
                      isSelected
                        ? 'text-[#00d5ff] translate-x-0.5'
                        : 'text-transparent group-hover:text-[#8b97a5]'
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </nav>

        {/* User Card & Authentication Section */}
        <div className="p-3 border-t border-[#16202c] bg-[#05070a]">
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Operator'}
                    className="w-7 h-7 rounded-full object-cover border border-[#00d5ff]/60 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#00d5ff]/15 text-[#00d5ff] flex items-center justify-center font-bold text-xs shrink-0">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div className="overflow-hidden leading-tight">
                  <p className="text-[11px] font-mono text-[#f5f7fa] font-bold truncate">
                    {user.displayName || 'Operator'}
                  </p>
                  <p className="text-[9px] font-mono text-[#35d07f] truncate flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#35d07f]" />
                    <span>Firestore Synced</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => signOut()}
                title="Cerrar sesión de Google"
                className="p-1 rounded text-[#8b97a5] hover:text-red-400 hover:bg-[#111820] transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn()}
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00d5ff]/10 border border-[#00d5ff]/30 text-xs font-mono text-[#00d5ff] hover:bg-[#00d5ff]/20 transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="font-semibold text-[11px]">Sign in with Google</span>
            </button>
          )}

          {/* Footer Security Pill */}
          <div className="mt-2 pt-2 border-t border-[#16202c]/60 text-[9px] font-mono text-[#8b97a5] flex items-center justify-between">
            <span>DATABASE</span>
            <span className="text-[#35d07f] font-bold flex items-center gap-1">
              <Database className="w-2.5 h-2.5" />
              <span>CLOUD FIRESTORE</span>
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Navegación Móvil de JARVIS"
        className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-[#0b1016]/95 backdrop-blur-md border-t border-[#16202c] z-30 flex items-center justify-around px-2"
      >
        {[
          { id: 'conversation', label: 'JARVIS', icon: Radio },
          { id: 'command_center', label: 'Control', icon: LayoutDashboard },
          { id: 'opportunities', label: 'Radar', icon: Sparkles },
          { id: 'action_proposals', label: 'Actions', icon: ShieldCheck },
          { id: 'google_integrations', label: 'GSuite', icon: Globe },
        ].map((item) => {
          const Icon = item.icon;
          const isSelected = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`flex flex-col items-center justify-center p-1 rounded transition-colors ${
                isSelected ? 'text-[#00d5ff]' : 'text-[#8b97a5]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[9px] font-mono mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};

