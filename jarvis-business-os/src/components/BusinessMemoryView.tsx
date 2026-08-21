import React, { useState } from 'react';
import {
  Database,
  Search,
  Plus,
  Tag,
  Clock,
  Trash2,
  Edit2,
  CheckCircle2,
  Sparkles,
  Target,
  FileCode,
  TrendingUp,
  Users,
  Package,
  Cpu,
  BookOpen,
  X,
} from 'lucide-react';
import { BusinessMemoryItem, MemoryCategory } from '../types.js';
import { formatDate } from '../lib/utils.js';
import { DataSourceBadge } from './DataSourceBadge.js';

interface BusinessMemoryViewProps {
  memoryItems: BusinessMemoryItem[];
  onStoreMemory: (item: {
    category: MemoryCategory;
    title: string;
    content: string;
    tags: string[];
    confidence?: number;
  }) => Promise<void>;
  onUpdateMemory: (id: string, updates: Partial<BusinessMemoryItem>) => Promise<void>;
  onDeleteMemory: (id: string) => Promise<void>;
  isLoading: boolean;
}

export const BusinessMemoryView: React.FC<BusinessMemoryViewProps> = ({
  memoryItems,
  onStoreMemory,
  onUpdateMemory,
  onDeleteMemory,
  isLoading,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BusinessMemoryItem | null>(null);

  // Form states
  const [formCategory, setFormCategory] = useState<MemoryCategory>('OBJECTIVES');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formConfidence, setFormConfidence] = useState<number>(95);

  const categories: { id: string; label: string; icon: any }[] = [
    { id: 'ALL', label: 'Toda la Memoria', icon: Database },
    { id: 'OBJECTIVES', label: 'Objetivos & OKRs', icon: Target },
    { id: 'PROJECTS', label: 'Proyectos', icon: FileCode },
    { id: 'DECISIONS', label: 'Decisiones', icon: CheckCircle2 },
    { id: 'METRICS', label: 'Métricas & KPIs', icon: TrendingUp },
    { id: 'CLIENTS', label: 'Clientes (ICP)', icon: Users },
    { id: 'PRODUCTS', label: 'Productos & Márgenes', icon: Package },
    { id: 'PROCESSES', label: 'Procesos (SOPs)', icon: Cpu },
    { id: 'LEARNINGS', label: 'Aprendizajes', icon: BookOpen },
  ];

  const filteredItems = memoryItems.filter((item) => {
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.content.toLowerCase().includes(q) ||
      item.tags.some((t) => t.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormCategory('OBJECTIVES');
    setFormTitle('');
    setFormContent('');
    setFormTags('');
    setFormConfidence(95);
    setShowAddModal(true);
  };

  const handleOpenEdit = (item: BusinessMemoryItem) => {
    setEditingItem(item);
    setFormCategory(item.category);
    setFormTitle(item.title);
    setFormContent(item.content);
    setFormTags(item.tags.join(', '));
    setFormConfidence(item.confidence || 95);
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;

    const tagsArray = formTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingItem) {
      await onUpdateMemory(editingItem.id, {
        category: formCategory,
        title: formTitle,
        content: formContent,
        tags: tagsArray,
        confidence: formConfidence,
      });
    } else {
      await onStoreMemory({
        category: formCategory,
        title: formTitle,
        content: formContent,
        tags: tagsArray,
        confidence: formConfidence,
      });
    }
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-[#10141f] border border-[#1e2538] rounded-xl p-6 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-4 h-4" /> PERSISTENT CORPORATE MEMORY HUB (/memory)
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            Memoria Empresarial Persistente
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            JARVIS recuerda objetivos, métricas históricas, decisiones aprobadas, aprendizajes y especificaciones del cliente. Esta memoria alimenta las decisiones autónomas de todos los agentes.
          </p>
        </div>

        <button
          id="btn_open_add_memory"
          onClick={handleOpenAdd}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-mono font-semibold flex items-center gap-2 shadow-md shadow-cyan-950 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Añadir Registro a Memoria</span>
        </button>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                id={`mem_cat_${cat.id.toLowerCase()}`}
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

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            id="mem_search_input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar en memoria..."
            className="w-full bg-[#10141f] border border-[#1e2538] rounded-lg py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 font-sans"
          />
        </div>
      </div>

      {/* Memory Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            id={`mem_item_${item.id}`}
            className="bg-[#0f131d] border border-[#1e2538] hover:border-cyan-500/40 rounded-xl p-5 space-y-3 shadow-lg shadow-black/20 transition-all flex flex-col justify-between"
          >
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                    {item.category}
                  </span>
                  <DataSourceBadge source={item.dataSource || 'REAL'} />
                  <span className="text-[10px] font-mono text-slate-400">
                    Confianza: {item.confidence}%
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    title="Editar memoria"
                    className="p-1 text-slate-400 hover:text-cyan-300 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteMemory(item.id)}
                    title="Eliminar memoria"
                    className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="text-xs font-bold text-slate-100">
                {item.title}
              </h3>

              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {item.content}
              </p>
            </div>

            <div className="pt-3 border-t border-[#1e2538] flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1">
                {item.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#151c2b] text-slate-400 border border-[#222a3d]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {formatDate(item.updatedAt)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Memory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#10141f] border border-[#232c40] rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1e2538] pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                  {editingItem ? 'Editar Registro de Memoria' : 'Nuevo Registro de Memoria'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">Categoría:</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as MemoryCategory)}
                  className="w-full bg-[#090c13] border border-[#1e2538] rounded-lg p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="OBJECTIVES">OBJECTIVES (Objetivos & OKRs)</option>
                  <option value="PROJECTS">PROJECTS (Iniciativas)</option>
                  <option value="DECISIONS">DECISIONS (Decisiones Tomadas)</option>
                  <option value="METRICS">METRICS (Métricas & Benchmarks)</option>
                  <option value="CLIENTS">CLIENTS (ICP & Cuentas)</option>
                  <option value="PRODUCTS">PRODUCTS (Catálogo & Márgenes)</option>
                  <option value="PROCESSES">PROCESSES (SOPs & Protocolos)</option>
                  <option value="LEARNINGS">LEARNINGS (Aprendizajes & Retros)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">Título del Registro:</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ej: Meta Q3 de ARR o Decisión de Pricing"
                  required
                  className="w-full bg-[#090c13] border border-[#1e2538] rounded-lg p-2.5 text-xs text-slate-200 font-sans focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">Contenido / Hechos Fácticos:</label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={4}
                  placeholder="Detalles precisos, números, contexto e impacto para la IA..."
                  required
                  className="w-full bg-[#090c13] border border-[#1e2538] rounded-lg p-2.5 text-xs text-slate-200 font-sans focus:outline-none focus:border-cyan-500/50 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">Etiquetas (separadas por coma):</label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="mrr, growth, saas, pricing"
                  className="w-full bg-[#090c13] border border-[#1e2538] rounded-lg p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1e2538]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-mono text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-semibold transition-colors"
                >
                  {editingItem ? 'Guardar Cambios' : 'Registrar en Memoria'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
