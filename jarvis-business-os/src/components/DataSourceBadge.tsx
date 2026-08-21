import React from 'react';
import { DataSourceType } from '../types.js';

interface DataSourceBadgeProps {
  source?: DataSourceType | string;
  size?: 'sm' | 'md';
}

export const DataSourceBadge: React.FC<DataSourceBadgeProps> = ({
  source = 'REAL',
  size = 'sm',
}) => {
  const isReal = source === 'REAL';
  const isDemo = source === 'DEMO';
  const isCalculated = source === 'CALCULATED';
  const isUnavailable = source === 'UNAVAILABLE';

  const sizeClasses = size === 'sm' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5';

  if (isReal) {
    return (
      <span
        title="Dato real originado de integraciones verificadas"
        className={`inline-flex items-center gap-1 font-mono font-bold uppercase rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 shadow-xs ${sizeClasses}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        REAL DATA
      </span>
    );
  }

  if (isDemo) {
    return (
      <span
        title="Datos de simulación / prueba de concepto"
        className={`inline-flex items-center gap-1 font-mono font-semibold uppercase rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 shadow-xs ${sizeClasses}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
        DEMO DATA
      </span>
    );
  }

  if (isCalculated) {
    return (
      <span
        title="Métrica calculada por motor analítico"
        className={`inline-flex items-center gap-1 font-mono font-medium uppercase rounded bg-purple-950/80 text-purple-300 border border-purple-700/60 shadow-xs ${sizeClasses}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
        CALCULATED
      </span>
    );
  }

  if (isUnavailable) {
    return (
      <span
        title="Dato no disponible"
        className={`inline-flex items-center gap-1 font-mono font-medium uppercase rounded bg-zinc-900 text-zinc-400 border border-zinc-700 ${sizeClasses}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
        UNAVAILABLE
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono uppercase rounded bg-slate-900 text-slate-300 border border-slate-700 ${sizeClasses}`}
    >
      {source}
    </span>
  );
};
