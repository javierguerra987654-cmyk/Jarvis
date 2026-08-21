import React, { useState } from 'react';
import {
  Sparkles,
  Filter,
  Search,
  ArrowUpRight,
  ShieldCheck,
  TrendingUp,
  Zap,
  Target,
  Package,
  Layers,
  DollarSign,
  ChevronRight,
  Eye,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { Opportunity, OpportunityCategory } from '../types.js';
import { DataSourceBadge } from './DataSourceBadge.js';

interface OpportunitiesViewProps {
  opportunities: Opportunity[];
  onAnalyzeOpportunity: (id: string) => Promise<void>;
  onPrepareAction: (id: string) => Promise<void>;
  onDismissOpportunity: (id: string) => Promise<void>;
  isAnalyzing: boolean;
}

export const OpportunitiesView: React.FC<OpportunitiesViewProps> = ({
  opportunities,
  onAnalyzeOpportunity,
  onPrepareAction,
  onDismissOpportunity,
  isAnalyzing,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalOpp, setActiveModalOpp] = useState<Opportunity | null>(null);

  const categories: { id: string; label: string; icon: any }[] = [
    { id: 'ALL', label: 'Todas', icon: Sparkles },
    { id: 'sales', label: 'Ventas', icon: TrendingUp },
    { id: 'marketing', label: 'Marketing', icon: Target },
    { id: 'seo', label: 'SEO', icon: Search },
    { id: 'product', label: 'Producto', icon: Package },
    { id: 'automation', label: 'Automatización', icon: Zap },
    { id: 'cost_reduction', label: 'Reducción Costes', icon: DollarSign },
    { id: 'conversion', label: 'Conversión (CRO)', icon: Target },
    { id: 'retention', label: 'Retención', icon: ShieldCheck },
  ];

  const filteredOpps = opportunities.filter((opp) => {
    const matchesCategory = selectedCategory === 'ALL' || opp.category === selectedCategory;
    const matchesQuery =
      opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.recommendedAction.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-[#10141f] border border-[#1e2538] rounded-xl p-6 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
              MÓDULO DE INTELIGENCIA ESTRATÉGICA
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            Radar Autónomo de Oportunidades
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            JARVIS escanea continuamente telemetría de negocio, logs de clientes, cuellos de botella de conversión y benchmarks de mercado para detectar oportunidades de alto ROI antes de que se pierdan.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-[#0a0d14] border border-[#1e2538] px-4 py-3 rounded-lg">
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">Total Oportunidades</div>
            <div className="text-xl font-bold font-mono text-cyan-300">{opportunities.length}</div>
          </div>
          <div className="h-8 w-px bg-[#1e2538]"></div>
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">Confianza Media</div>
            <div className="text-xl font-bold font-mono text-emerald-400">92.4%</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                id={`cat_filter_${cat.id}`}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-cyan-600 text-white font-bold shadow-sm shadow-cyan-950'
                    : 'bg-[#10141f] border border-[#1e2538] text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            id="opp_search_input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar oportunidad..."
            className="w-full bg-[#10141f] border border-[#1e2538] rounded-lg py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>

      {/* Opportunities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredOpps.map((opp) => (
          <div
            key={opp.id}
            id={`opp_card_${opp.id}`}
            className="bg-[#0f131d] border border-[#1e2538] hover:border-cyan-500/40 rounded-xl p-5 space-y-4 transition-all flex flex-col justify-between group shadow-lg shadow-black/20"
          >
            <div className="space-y-3">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                      {opp.category}
                    </span>
                    <DataSourceBadge source={opp.dataSource || 'REAL'} />
                    <span className="text-[10px] font-mono text-slate-400">
                      Agente: <strong className="text-slate-300">{opp.assignedAgent}</strong>
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-200 transition-colors">
                    {opp.title}
                  </h3>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-mono font-bold text-emerald-400 block">
                    {opp.estimatedImpact}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Impacto Estimado</span>
                </div>
              </div>

              {/* Confidence Meter */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400">Confianza de IA:</span>
                  <span className="text-slate-200 font-bold">{opp.confidence}%</span>
                </div>
                <div className="w-full bg-[#171e2c] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${opp.confidence}%` }}
                  ></div>
                </div>
              </div>

              {/* Motive / Reason */}
              <div className="bg-[#0b0e15] border border-[#1b2233] p-3 rounded-lg space-y-1">
                <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
                  Motivo & Detección:
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {opp.reason}
                </p>
              </div>

              {/* Recommended Action */}
              <div className="bg-[#0b0e15] border border-cyan-950/60 p-3 rounded-lg space-y-1">
                <div className="text-[10px] font-mono uppercase text-cyan-400 font-semibold">
                  Acción Recomendada:
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {opp.recommendedAction}
                </p>
              </div>

              {/* Data Sources Used */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-mono text-slate-400 mr-1">Datos Utilizados:</span>
                {opp.dataUsed.map((data, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161c2b] border border-[#222a3d] text-slate-300"
                  >
                    {data}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-[#1e2538]">
              <button
                id={`btn_dismiss_opp_${opp.id}`}
                onClick={() => onDismissOpportunity(opp.id)}
                title="Descartar oportunidad"
                className="text-xs text-slate-400 hover:text-rose-400 font-mono transition-colors p-1.5 rounded hover:bg-rose-950/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  id={`btn_opp_analyze_${opp.id}`}
                  onClick={() => onAnalyzeOpportunity(opp.id)}
                  disabled={isAnalyzing}
                  className="px-3 py-1.5 text-xs font-mono text-cyan-300 hover:bg-cyan-950/50 rounded-lg border border-cyan-800/80 transition-colors disabled:opacity-50"
                >
                  Analizar
                </button>
                <button
                  id={`btn_opp_prep_action_${opp.id}`}
                  onClick={() => onPrepareAction(opp.id)}
                  className="px-3.5 py-1.5 text-xs font-mono font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg transition-all shadow-sm shadow-cyan-950 cursor-pointer"
                >
                  Preparar Acción
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
