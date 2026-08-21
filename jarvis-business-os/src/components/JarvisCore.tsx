import React, { useMemo } from 'react';
import { Mic, Volume2, Cpu, Zap, AlertCircle, Radio, Wrench, Globe, Mail, Calendar, Database, ShieldCheck } from 'lucide-react';
import { VoiceState } from '../types.js';

export type JarvisCoreState = VoiceState | 'TOOL_EXECUTION' | 'OFFLINE';

interface JarvisCoreProps {
  state: JarvisCoreState;
  audioLevel?: number; // 0 to 1 RMS value
  activeToolName?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  onClick?: () => void;
  className?: string;
  sublabel?: string;
}

export const JarvisCore: React.FC<JarvisCoreProps> = ({
  state,
  audioLevel = 0,
  activeToolName,
  size = 'hero',
  onClick,
  className = '',
  sublabel,
}) => {
  // Clamp audio level
  const clampedLevel = Math.max(0, Math.min(1, audioLevel));

  const config = useMemo(() => {
    switch (state) {
      case 'LISTENING':
        return {
          glowColor: 'rgba(255, 184, 77, 0.45)',
          glowClass: 'bg-amber-500/30',
          outerRing: 'border-amber-400/80 shadow-[0_0_35px_rgba(255,184,77,0.4)]',
          innerRing: 'border-amber-300/60',
          coreBg: 'bg-gradient-to-br from-amber-950/90 via-[#070b10] to-amber-900/70 border-amber-400 text-amber-300',
          statusText: 'LISTENING',
          label: 'LISTENING',
          tag: 'VOICE INGRESS',
          icon: Mic,
          iconColor: 'text-amber-300',
          orbitSpeed: 'animate-jarvis-orbit',
          ringPulse: true,
          eqGradient: 'from-amber-500 to-amber-300',
          accentColor: '#ffb84d',
          gridStroke: 'rgba(255, 184, 77, 0.22)',
          nodeFill: '#ffb84d',
        };
      case 'SPEAKING':
        return {
          glowColor: 'rgba(53, 208, 127, 0.45)',
          glowClass: 'bg-emerald-500/30',
          outerRing: 'border-emerald-400/80 shadow-[0_0_40px_rgba(53,208,127,0.4)]',
          innerRing: 'border-cyan-300/60',
          coreBg: 'bg-gradient-to-br from-emerald-950/90 via-[#070b10] to-cyan-950/80 border-emerald-400 text-emerald-300',
          statusText: 'SPEAKING',
          label: 'SPEAKING',
          tag: 'SYNTHESIS 24kHz',
          icon: Volume2,
          iconColor: 'text-emerald-300',
          orbitSpeed: 'animate-jarvis-orbit-fast',
          ringPulse: true,
          eqGradient: 'from-emerald-400 to-cyan-300',
          accentColor: '#35d07f',
          gridStroke: 'rgba(53, 208, 127, 0.22)',
          nodeFill: '#35d07f',
        };
      case 'THINKING':
        return {
          glowColor: 'rgba(0, 213, 255, 0.45)',
          glowClass: 'bg-cyan-500/30',
          outerRing: 'border-cyan-400/80 shadow-[0_0_35px_rgba(0,213,255,0.35)]',
          innerRing: 'border-blue-400/70',
          coreBg: 'bg-gradient-to-br from-cyan-950/90 via-[#070b10] to-blue-950/90 border-cyan-400 text-cyan-300',
          statusText: 'PROCESSING',
          label: 'PROCESSING',
          tag: 'NEURAL REASONING',
          icon: Cpu,
          iconColor: 'text-cyan-300 animate-spin',
          orbitSpeed: 'animate-jarvis-orbit-fast',
          ringPulse: false,
          eqGradient: 'from-cyan-500 to-blue-400',
          accentColor: '#00d5ff',
          gridStroke: 'rgba(0, 213, 255, 0.25)',
          nodeFill: '#00d5ff',
        };
      case 'TOOL_EXECUTION':
        return {
          glowColor: 'rgba(101, 117, 255, 0.45)',
          glowClass: 'bg-indigo-500/35',
          outerRing: 'border-indigo-400/80 shadow-[0_0_35px_rgba(101,117,255,0.45)]',
          innerRing: 'border-cyan-400/70',
          coreBg: 'bg-gradient-to-br from-indigo-950/90 via-[#070b10] to-cyan-950/80 border-indigo-400 text-indigo-300',
          statusText: 'TOOL EXECUTION',
          label: (activeToolName || 'TOOL').toUpperCase(),
          tag: 'EXECUTION AGENT',
          icon: Wrench,
          iconColor: 'text-indigo-300 animate-pulse',
          orbitSpeed: 'animate-jarvis-orbit-fast',
          ringPulse: true,
          eqGradient: 'from-indigo-400 to-cyan-400',
          accentColor: '#6575ff',
          gridStroke: 'rgba(101, 117, 255, 0.25)',
          nodeFill: '#6575ff',
        };
      case 'ERROR':
        return {
          glowColor: 'rgba(255, 92, 112, 0.4)',
          glowClass: 'bg-rose-500/30',
          outerRing: 'border-rose-500/80 shadow-[0_0_30px_rgba(255,92,112,0.45)]',
          innerRing: 'border-rose-400/50',
          coreBg: 'bg-gradient-to-br from-rose-950/90 via-[#070b10] to-rose-900/70 border-rose-500 text-rose-300',
          statusText: 'ERROR',
          label: 'ERROR',
          tag: 'ALERT RECOVERY',
          icon: AlertCircle,
          iconColor: 'text-rose-400',
          orbitSpeed: '',
          ringPulse: false,
          eqGradient: 'from-rose-500 to-rose-400',
          accentColor: '#ff5c70',
          gridStroke: 'rgba(255, 92, 112, 0.22)',
          nodeFill: '#ff5c70',
        };
      case 'OFFLINE':
        return {
          glowColor: 'rgba(139, 151, 165, 0.1)',
          glowClass: 'bg-slate-800/10',
          outerRing: 'border-slate-800/60',
          innerRing: 'border-slate-800/40',
          coreBg: 'bg-[#070b10] border-slate-800 text-slate-600',
          statusText: 'OFFLINE',
          label: 'OFFLINE',
          tag: 'STANDBY',
          icon: Radio,
          iconColor: 'text-slate-600',
          orbitSpeed: '',
          ringPulse: false,
          eqGradient: 'from-slate-800 to-slate-700',
          accentColor: '#4e5c6e',
          gridStroke: 'rgba(139, 151, 165, 0.08)',
          nodeFill: '#4e5c6e',
        };
      case 'IDLE':
      default:
        return {
          glowColor: 'rgba(0, 213, 255, 0.25)',
          glowClass: 'bg-cyan-500/20',
          outerRing: 'border-cyan-500/50 shadow-[0_0_28px_rgba(0,213,255,0.22)] animate-jarvis-idle',
          innerRing: 'border-cyan-400/40',
          coreBg: 'bg-gradient-to-br from-[#06101c] via-[#091524] to-[#040810] border-cyan-400/70 text-cyan-300',
          statusText: 'ONLINE',
          label: 'READY',
          tag: 'SYSTEM STABLE',
          icon: Zap,
          iconColor: 'text-cyan-300',
          orbitSpeed: 'animate-jarvis-orbit',
          ringPulse: false,
          eqGradient: 'from-cyan-500 to-cyan-300',
          accentColor: '#00d5ff',
          gridStroke: 'rgba(0, 213, 255, 0.18)',
          nodeFill: '#00d5ff',
        };
    }
  }, [state, activeToolName]);

  const sizeClasses = useMemo(() => {
    switch (size) {
      case 'sm':
        return {
          wrapper: 'w-32 h-32',
          outerRing: 'w-26 h-26',
          midRing: 'w-20 h-20',
          innerRing: 'w-14 h-14',
          core: 'w-10 h-10',
          iconSize: 'w-4 h-4',
          labelSize: 'text-[7px]',
          glowSize: 'w-28 h-28',
          svgSize: 120,
        };
      case 'md':
        return {
          wrapper: 'w-48 h-48',
          outerRing: 'w-40 h-40',
          midRing: 'w-32 h-32',
          innerRing: 'w-24 h-24',
          core: 'w-16 h-16',
          iconSize: 'w-6 h-6',
          labelSize: 'text-[8px]',
          glowSize: 'w-48 h-48',
          svgSize: 180,
        };
      case 'lg':
        return {
          wrapper: 'w-64 h-64 sm:w-76 sm:h-76',
          outerRing: 'w-52 h-52 sm:w-64 sm:h-64',
          midRing: 'w-40 h-40 sm:w-48 sm:h-48',
          innerRing: 'w-28 h-28 sm:w-34 sm:h-34',
          core: 'w-18 h-18 sm:w-22 sm:h-22',
          iconSize: 'w-7 h-7 sm:w-8 sm:h-8',
          labelSize: 'text-[9px] sm:text-[10px]',
          glowSize: 'w-64 h-64 sm:w-80 sm:h-80',
          svgSize: 280,
        };
      case 'hero':
      default:
        return {
          wrapper: 'w-72 h-72 sm:w-88 sm:h-88 lg:w-96 lg:h-96',
          outerRing: 'w-60 h-60 sm:w-72 sm:h-72 lg:w-80 lg:h-80',
          midRing: 'w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64',
          innerRing: 'w-36 h-36 sm:w-42 sm:h-42 lg:w-48 lg:h-48',
          core: 'w-22 h-22 sm:w-26 sm:h-26 lg:w-30 lg:h-30',
          iconSize: 'w-8 h-8 sm:w-10 sm:h-10',
          labelSize: 'text-[10px] sm:text-[11px]',
          glowSize: 'w-80 h-80 sm:w-96 sm:h-96',
          svgSize: 360,
        };
    }
  }, [size]);

  const IconComponent = config.icon;

  return (
    <div
      role="region"
      aria-label={`Núcleo Holográfico JARVIS en estado ${config.statusText}`}
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center select-none ${sizeClasses.wrapper} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* 1. Ambient Background Radial Glow */}
      <div
        style={{
          transform: `scale(${state === 'LISTENING' || state === 'SPEAKING' ? 1 + clampedLevel * 0.45 : 1})`,
          opacity: state === 'OFFLINE' ? 0.08 : state === 'IDLE' ? 0.35 : 0.55 + clampedLevel * 0.4,
        }}
        className={`absolute rounded-full filter blur-3xl pointer-events-none transition-all duration-300 ${sizeClasses.glowSize} ${config.glowClass}`}
      />

      {/* 2. Waveform Acoustic Emission Rings for Voice/Mic */}
      {state === 'LISTENING' && (
        <>
          <div
            style={{
              transform: `scale(${1 + clampedLevel * 0.5})`,
              opacity: 0.7 + clampedLevel * 0.3,
            }}
            className="absolute inset-0 rounded-full border-2 border-amber-400/70 animate-listening-ripple pointer-events-none transition-transform duration-75"
          />
          <div
            style={{
              transform: `scale(${1 + clampedLevel * 0.35})`,
              opacity: 0.5 + clampedLevel * 0.3,
            }}
            className="absolute inset-4 rounded-full border border-amber-300/40 animate-listening-ripple pointer-events-none transition-transform duration-75 [animation-delay:0.7s]"
          />
        </>
      )}

      {state === 'SPEAKING' && (
        <>
          <div
            style={{
              transform: `scale(${1 + clampedLevel * 0.55})`,
              opacity: 0.75 + clampedLevel * 0.25,
            }}
            className="absolute inset-0 rounded-full border-2 border-emerald-400/80 animate-speaking-ripple pointer-events-none transition-transform duration-75"
          />
          <div
            style={{
              transform: `scale(${1 + clampedLevel * 0.4})`,
              opacity: 0.5 + clampedLevel * 0.3,
            }}
            className="absolute inset-4 rounded-full border border-cyan-400/60 animate-speaking-ripple pointer-events-none transition-transform duration-75 [animation-delay:0.6s]"
          />
        </>
      )}

      {/* 3. High-Precision Vector Neural Hologram (Concentric rings, orbital nodes, geometry) */}
      <svg
        viewBox="0 0 360 360"
        className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="jarvisCoreRadial" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={config.accentColor} stopOpacity="0.8" />
            <stop offset="45%" stopColor={config.accentColor} stopOpacity="0.3" />
            <stop offset="85%" stopColor="#040810" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#020408" stopOpacity="0.95" />
          </radialGradient>
          <linearGradient id="orbitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={config.accentColor} stopOpacity="0.9" />
            <stop offset="50%" stopColor="#00d5ff" stopOpacity="0.4" />
            <stop offset="100%" stopColor={config.accentColor} stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Outer Circular Scale with Radar Ticks */}
        <circle
          cx="180"
          cy="180"
          r="168"
          fill="none"
          stroke={config.gridStroke}
          strokeWidth="1.2"
        />
        <circle
          cx="180"
          cy="180"
          r="156"
          fill="none"
          stroke={config.gridStroke}
          strokeWidth="0.8"
          strokeDasharray="2 6"
        />

        {/* 12 Radian Optical Ticks */}
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i * 360) / 24;
          const rad = (angle * Math.PI) / 180;
          const x1 = 180 + Math.cos(rad) * 162;
          const y1 = 180 + Math.sin(rad) * 162;
          const x2 = 180 + Math.cos(rad) * (i % 3 === 0 ? 172 : 166);
          const y2 = 180 + Math.sin(rad) * (i % 3 === 0 ? 172 : 166);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={config.accentColor}
              strokeOpacity={i % 3 === 0 ? 0.7 : 0.3}
              strokeWidth={i % 3 === 0 ? 1.5 : 0.8}
            />
          );
        })}

        {/* Outer Orbital Segment Rings (Clockwise & Counter Clockwise) */}
        <g className={config.orbitSpeed}>
          <circle
            cx="180"
            cy="180"
            r="140"
            fill="none"
            stroke="url(#orbitGradient)"
            strokeWidth="2.5"
            strokeDasharray="65 30 15 30 45 40"
          />
          {/* Orbital Node satellites */}
          <circle cx="180" cy="40" r="3.5" fill={config.nodeFill} filter="drop-shadow(0 0 6px #00d5ff)" />
          <circle cx="320" cy="180" r="2.5" fill={config.nodeFill} />
          <circle cx="180" cy="320" r="3.5" fill={config.nodeFill} filter="drop-shadow(0 0 6px #00d5ff)" />
          <circle cx="40" cy="180" r="2.5" fill={config.nodeFill} />
        </g>

        <g className="animate-jarvis-orbit-reverse">
          <circle
            cx="180"
            cy="180"
            r="120"
            fill="none"
            stroke={config.accentColor}
            strokeOpacity="0.5"
            strokeWidth="1.5"
            strokeDasharray="40 18 80 25"
          />
          {/* Hexagonal Node Constellation */}
          {Array.from({ length: 6 }).map((_, i) => {
            const angle = (i * 360) / 6;
            const rad = (angle * Math.PI) / 180;
            const cx = 180 + Math.cos(rad) * 120;
            const cy = 180 + Math.sin(rad) * 120;
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r="3" fill={config.nodeFill} />
                <line
                  x1="180"
                  y1="180"
                  x2={cx}
                  y2={cy}
                  stroke={config.accentColor}
                  strokeOpacity="0.2"
                  strokeWidth="0.75"
                />
              </g>
            );
          })}
        </g>

        {/* Inner Geometric Star Matrix (Neural Connectivity) */}
        <g className={config.orbitSpeed}>
          <polygon
            points="180,95 253,137 253,222 180,265 107,222 107,137"
            fill="none"
            stroke={config.accentColor}
            strokeOpacity="0.4"
            strokeWidth="1"
          />
          <polygon
            points="180,265 107,137 253,137"
            fill="none"
            stroke={config.accentColor}
            strokeOpacity="0.25"
            strokeWidth="0.8"
          />
          <polygon
            points="180,95 253,222 107,222"
            fill="none"
            stroke={config.accentColor}
            strokeOpacity="0.25"
            strokeWidth="0.8"
          />
        </g>

        {/* Center Target Crosshairs */}
        <line x1="180" y1="65" x2="180" y2="90" stroke={config.accentColor} strokeWidth="1.2" strokeOpacity="0.8" />
        <line x1="180" y1="270" x2="180" y2="295" stroke={config.accentColor} strokeWidth="1.2" strokeOpacity="0.8" />
        <line x1="65" y1="180" x2="90" y2="180" stroke={config.accentColor} strokeWidth="1.2" strokeOpacity="0.8" />
        <line x1="270" y1="180" x2="295" y2="180" stroke={config.accentColor} strokeWidth="1.2" strokeOpacity="0.8" />
      </svg>

      {/* 4. Central Reactor Core Physical DOM Element */}
      <div
        style={{
          transform: `scale(${state === 'LISTENING' || state === 'SPEAKING' ? 1 + clampedLevel * 0.28 : 1})`,
          boxShadow:
            state === 'LISTENING'
              ? `0 0 ${28 + clampedLevel * 45}px rgba(255,184,77,${0.4 + clampedLevel * 0.5}), inset 0 0 ${20 + clampedLevel * 25}px rgba(255,184,77,0.4)`
              : state === 'SPEAKING'
              ? `0 0 ${32 + clampedLevel * 55}px rgba(53,208,127,${0.45 + clampedLevel * 0.5}), inset 0 0 ${25 + clampedLevel * 30}px rgba(0,213,255,0.45)`
              : state === 'THINKING'
              ? '0 0 35px rgba(0,213,255,0.4), inset 0 0 20px rgba(0,213,255,0.3)'
              : '0 0 25px rgba(0,213,255,0.25), inset 0 0 15px rgba(0,213,255,0.2)',
        }}
        className={`rounded-full flex flex-col items-center justify-center transition-all duration-100 relative z-10 border ${sizeClasses.core} ${config.coreBg} shadow-2xl`}
      >
        <IconComponent className={`${sizeClasses.iconSize} ${config.iconColor}`} />
        {size !== 'sm' && (
          <span
            className={`font-mono font-bold tracking-widest uppercase mt-1 ${sizeClasses.labelSize} ${
              state === 'LISTENING'
                ? 'text-amber-300'
                : state === 'SPEAKING'
                ? 'text-emerald-300'
                : state === 'THINKING'
                ? 'text-cyan-300'
                : state === 'TOOL_EXECUTION'
                ? 'text-indigo-300'
                : state === 'ERROR'
                ? 'text-rose-400'
                : 'text-cyan-300'
            }`}
          >
            {config.label}
          </span>
        )}
      </div>

      {/* 5. Live Audio Frequency Equalizer Bar & Status Tag */}
      {size !== 'sm' && (
        <div className="absolute -bottom-6 flex flex-col items-center gap-1">
          <div className="flex items-center gap-1 h-5 px-3 py-0.5 rounded-full bg-[#050b12]/95 border border-[#00d5ff]/30 shadow-lg shadow-black/80">
            {[0.2, 0.45, 0.7, 0.9, 1.1, 1.3, 1.1, 0.9, 0.7, 0.45, 0.2].map((factor, i) => {
              const dynamicH =
                state === 'LISTENING' || state === 'SPEAKING'
                  ? Math.max(3, Math.min(18, Math.round(16 * factor * (clampedLevel > 0 ? Math.max(clampedLevel * 1.8, 0.25) : 0.25))))
                  : 3;
              return (
                <div
                  key={i}
                  style={{ height: `${dynamicH}px` }}
                  className={`w-1 rounded-full bg-gradient-to-t transition-all duration-75 ${config.eqGradient}`}
                />
              );
            })}
          </div>
          {sublabel && (
            <span className="text-[9px] font-mono tracking-wider uppercase text-[#7e9bb5]">
              {sublabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
