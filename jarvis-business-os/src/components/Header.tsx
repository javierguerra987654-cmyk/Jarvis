import React, { useState } from 'react';
import {
  ShieldAlert,
  Bot,
  Sparkles,
  RefreshCw,
  Clock,
  Radio,
  ExternalLink,
  LogIn,
  LogOut,
  User as UserIcon,
  Database,
  CheckCircle2,
} from 'lucide-react';
import { AutonomyLevel, SystemState } from '../types.js';
import { useAuth } from '../contexts/AuthContext.js';

interface HeaderProps {
  systemState: SystemState | null;
  autonomyLevel: AutonomyLevel;
  onChangeAutonomy: (level: AutonomyLevel) => void;
  onRefresh: () => void;
  isLoading: boolean;
  currentViewTitle: string;
  onNavigateToConversation?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  systemState,
  autonomyLevel,
  onChangeAutonomy,
  onRefresh,
  isLoading,
  currentViewTitle,
  onNavigateToConversation,
}) => {
  const { user, profile, signIn, signOut, loading: authLoading } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const levels: { level: AutonomyLevel; label: string; desc: string }[] = [
    { level: 'LOW', label: 'LOW (Protegido)', desc: 'Toda acción requiere aprobación humana' },
    { level: 'MEDIUM', label: 'MEDIUM (Supervisado)', desc: 'Auto-ejecuta acciones de bajo riesgo' },
    { level: 'HIGH', label: 'HIGH (Autónomo)', desc: 'Auto-ejecuta riesgo bajo y medio' },
  ];

  return (
    <header
      id="top_header"
      aria-label="Encabezado del Módulo de JARVIS"
      className="h-14 border-b border-[#16202c] bg-[#05070a]/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shrink-0"
    >
      {/* Title & View indicator */}
      <div className="flex items-center gap-3">
        {onNavigateToConversation && (
          <button
            onClick={onNavigateToConversation}
            title="Volver a la conversación principal de JARVIS"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0b1016] border border-[#16202c] text-xs font-mono text-[#00d5ff] hover:bg-[#111820] transition-colors"
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">JARVIS</span>
          </button>
        )}
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-bold text-[#f5f7fa] uppercase tracking-wide font-mono">
            {currentViewTitle}
          </h1>
          <span className="w-1.5 h-1.5 rounded-full bg-[#00d5ff]" />
          <span className="text-[10px] font-mono text-[#8b97a5] hidden md:inline">
            BUSINESS INTELLIGENCE OS
          </span>
        </div>
      </div>

      {/* Right controls: Autonomy Selector & Quick Telemetry & Auth */}
      <div className="flex items-center gap-3">
        {/* Firestore Indicator */}
        <div
          title="Base de datos Firestore conectada con sincronización en tiempo real"
          className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded bg-[#0b1016] border border-[#16202c] text-[10px] font-mono text-[#35d07f]"
        >
          <Database className="w-3 h-3 text-[#35d07f]" />
          <span>FIRESTORE LIVE</span>
        </div>

        {/* Autonomy Level Control */}
        <div className="flex items-center bg-[#0b1016] border border-[#16202c] rounded-lg p-0.5 gap-1">
          <div className="hidden sm:flex items-center px-2 py-1 gap-1 text-[10px] font-mono text-[#8b97a5] border-r border-[#16202c]">
            <ShieldAlert className="w-3 h-3 text-[#00d5ff]" />
            <span className="font-semibold uppercase">AUTONOMY:</span>
          </div>
          {levels.map((item) => {
            const isSelected = autonomyLevel === item.level;
            return (
              <button
                key={item.level}
                id={`autonomy_btn_${item.level.toLowerCase()}`}
                onClick={() => onChangeAutonomy(item.level)}
                title={item.desc}
                className={`px-2 py-0.5 text-[10px] font-mono rounded transition-all cursor-pointer ${
                  isSelected
                    ? item.level === 'HIGH'
                      ? 'bg-purple-950 text-purple-300 border border-purple-800 font-bold'
                      : item.level === 'MEDIUM'
                      ? 'bg-cyan-950 text-[#00d5ff] border border-cyan-800 font-bold'
                      : 'bg-emerald-950 text-[#35d07f] border border-emerald-800 font-bold'
                    : 'text-[#8b97a5] hover:text-[#f5f7fa] hover:bg-[#111820]'
                }`}
              >
                {item.level}
              </button>
            );
          })}
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          title="Actualizar telemetría del sistema"
          className="p-1.5 rounded-lg bg-[#0b1016] border border-[#16202c] text-[#8b97a5] hover:text-[#f5f7fa] hover:bg-[#111820] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#00d5ff]' : ''}`} />
        </button>

        {/* User Auth Profile / Google Sign-in */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu((prev) => !prev)}
              className="flex items-center gap-2 px-2 py-1 rounded-lg bg-[#0b1016] border border-[#00d5ff]/30 text-xs font-mono text-[#f5f7fa] hover:bg-[#111820] transition-colors cursor-pointer"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-5 h-5 rounded-full object-cover border border-[#00d5ff]/50"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-[#00d5ff]/20 text-[#00d5ff] flex items-center justify-center font-bold text-[10px]">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <span className="hidden sm:inline text-[11px] truncate max-w-[100px]">
                {user.displayName || user.email?.split('@')[0] || 'Operator'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#35d07f]" />
            </button>

            {/* Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#0b1016] border border-[#16202c] shadow-2xl p-3 z-50 text-xs font-mono">
                <div className="flex items-center gap-2.5 pb-2.5 border-b border-[#16202c]">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-8 h-8 rounded-full object-cover border border-[#00d5ff]"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#00d5ff]/20 text-[#00d5ff] flex items-center justify-center font-bold text-sm">
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="font-bold text-[#f5f7fa] truncate">{user.displayName || 'Operator'}</p>
                    <p className="text-[10px] text-[#8b97a5] truncate">{user.email}</p>
                  </div>
                </div>

                <div className="py-2.5 space-y-1.5 text-[10px] border-b border-[#16202c]">
                  <div className="flex items-center justify-between text-[#8b97a5]">
                    <span>AUTH PROVIDER</span>
                    <span className="text-[#00d5ff] font-semibold">Firebase (Google)</span>
                  </div>
                  <div className="flex items-center justify-between text-[#8b97a5]">
                    <span>PERSISTENCE</span>
                    <span className="text-[#35d07f] font-semibold">Cloud Firestore</span>
                  </div>
                  <div className="flex items-center justify-between text-[#8b97a5]">
                    <span>OPERATOR ROLE</span>
                    <span className="px-1.5 py-0.2 rounded bg-purple-950/60 text-purple-300 border border-purple-800 font-bold">
                      ADMIN / GOVERNOR
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    signOut();
                  }}
                  className="w-full mt-2.5 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/30 border border-red-800/50 text-red-300 hover:bg-red-900/50 transition-colors text-xs font-mono"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => signIn()}
            disabled={authLoading}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#00d5ff]/10 border border-[#00d5ff]/40 text-xs font-mono text-[#00d5ff] hover:bg-[#00d5ff]/20 transition-all cursor-pointer shadow-sm"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span className="font-semibold">Sign in with Google</span>
          </button>
        )}
      </div>
    </header>
  );
};

