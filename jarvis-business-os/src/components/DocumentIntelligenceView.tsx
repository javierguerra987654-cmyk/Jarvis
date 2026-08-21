import React, { useState } from 'react';
import {
  FileText,
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Play,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { DocumentAnalysisResult } from '../types.js';

interface DocumentIntelligenceViewProps {
  onAnalyzeDocument: (filename: string, content: string, fileType: string) => Promise<DocumentAnalysisResult | null>;
  isAnalyzing: boolean;
}

export const DocumentIntelligenceView: React.FC<DocumentIntelligenceViewProps> = ({
  onAnalyzeDocument,
  isAnalyzing,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileType, setFileType] = useState('text/plain');
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysisResult | null>(null);

  const sampleDatasets = [
    {
      title: 'Reporte Financiero Q3 & Funnel SaaS.csv',
      type: 'text/csv',
      content: `Mes,Nuevos_Leads,Demos_Agendadas,Nuevos_Clientes,MRR_Adicionado,CAC_Medio,Churn_Rate
Mayo 2026,380,82,24,$14200,$390,1.8%
Junio 2026,410,88,28,$16800,$410,2.0%
Julio 2026,460,94,32,$19200,$440,2.3%
Agosto 2026,490,102,36,$21600,$420,2.1%
Nota_Auditoria: Se observa que el gasto en Google Ads aumentó un 32% en Julio pero el 44% de los leads generados no completaron la prueba por un error de validación en el formulario móvil.`,
    },
    {
      title: 'Auditoría de Competidores y Precios 2026.json',
      type: 'application/json',
      content: JSON.stringify(
        {
          competitors: [
            {
              name: 'CloudSync Pro',
              tierStarter: 79,
              tierBusiness: 249,
              recentChanges: 'Aumento de precios del 30% en Agosto 2026 y eliminación del soporte prioritario en planes básicos',
              customerComplaints: 'Incremento en costes inesperados por límite de asientos',
            },
            {
              name: 'OpsFlow Enterprise',
              tierStarter: 99,
              tierBusiness: 399,
              recentChanges: 'Migración obligatoria a contratos anuales mínimos de $4,800',
              customerComplaints: 'Falta de flexibilidad para equipos de menos de 25 personas',
            },
          ],
          marketOpportunities: 'Capturar clientes insatisfechos mediante ofertas de migración con garantía de precio fijo y onboarding express',
        },
        null,
        2
      ),
    },
    {
      title: 'Log de Fricción en Checkout y Soporte.txt',
      type: 'text/plain',
      content: `[INCIDENTE 1024]
Fecha: 2026-08-18
Origen: Checkout Mobile iOS Safari (<390px)
Descripción: 48 usuarios intentaron pagar el Plan Business anual. El campo de código de cupón cubría el botón "Confirmar Pago con Stripe".
Tasa de abandono en esa sesión: 84%.
Ingresos directos no capturados en 48 horas: ~$14,200.`,
    },
  ];

  const handleFileUpload = (file: File) => {
    setFileName(file.name);
    setFileType(file.type || 'text/plain');
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setFileContent(text);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSelectSample = (sample: typeof sampleDatasets[0]) => {
    setFileName(sample.title);
    setFileType(sample.type);
    setFileContent(sample.content);
  };

  const handleRunAnalysis = async () => {
    if (!fileContent.trim() || isAnalyzing) return;
    const result = await onAnalyzeDocument(fileName || 'Documento_Empresarial.txt', fileContent, fileType);
    if (result) {
      setAnalysisResult(result);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-[#10141f] border border-[#1e2538] rounded-xl p-6 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> MULTIMODAL DOCUMENT INTELLIGENCE
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            Auditoría & Análisis de Documentos
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Sube hojas de cálculo (CSV), reportes financieros, auditorías de competidores o logs de soporte. JARVIS extraerá métricas estructuradas, detectará anomalías y convertirá la información en oportunidades de negocio.
          </p>
        </div>
      </div>

      {/* Preset Datasets */}
      <div className="space-y-2">
        <div className="text-xs font-mono text-slate-400 uppercase font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Cargar Dataset de Demostración para Prueba Rápida:
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {sampleDatasets.map((sample, idx) => (
            <button
              key={idx}
              id={`btn_sample_doc_${idx}`}
              onClick={() => handleSelectSample(sample)}
              className="p-3 bg-[#0f131d] border border-[#1e2538] hover:border-cyan-500/40 rounded-lg text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200 group-hover:text-cyan-300">
                <FileSpreadsheet className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="truncate">{sample.title}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                Haz clic para cargar y analizar con Gemini.
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Upload Zone & Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Drop Zone / Content view */}
        <div className="space-y-3">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
              dragActive
                ? 'border-cyan-400 bg-cyan-950/20'
                : 'border-[#222a3d] bg-[#0c0f16] hover:border-[#2f3b54]'
            }`}
          >
            <UploadCloud className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
            <div className="text-xs font-bold text-slate-200">
              Arrastra y suelta tu archivo aquí, o{' '}
              <label className="text-cyan-400 hover:underline cursor-pointer">
                selecciona un archivo
                <input
                  type="file"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Formatos soportados: CSV, JSON, TXT, Logs y Reportes Financieros
            </p>
          </div>

          {/* Text Area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Contenido del Documento ({fileName || 'Sin archivo seleccionado'}):</span>
              <span>{fileContent.length} caracteres</span>
            </div>
            <textarea
              id="doc_content_textarea"
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              rows={8}
              placeholder="O pega directamente aquí el texto o tabla de datos..."
              className="w-full bg-[#090c13] border border-[#1e2538] rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500/50 resize-none"
            />
          </div>

          <button
            id="btn_run_doc_analysis"
            onClick={handleRunAnalysis}
            disabled={isAnalyzing || !fileContent.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-mono font-semibold transition-all shadow-lg shadow-cyan-950/50 disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isAnalyzing ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Analizando con Gemini 3.7...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Auditar Documento & Extraer Oportunidades</span>
              </>
            )}
          </button>
        </div>

        {/* Results Panel */}
        <div>
          {analysisResult ? (
            <div className="bg-[#10141f] border border-cyan-500/30 rounded-xl p-5 space-y-5 shadow-xl shadow-cyan-950/20">
              <div className="flex items-center justify-between border-b border-[#1e2538] pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-mono font-bold text-slate-100 uppercase tracking-wider">
                    Auditoría Inteligente Completada
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-cyan-400">{analysisResult.filename}</span>
              </div>

              {/* Summary */}
              <div className="space-y-1">
                <div className="text-[11px] font-mono uppercase text-slate-400 font-semibold">
                  Resumen Ejecutivo:
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {analysisResult.summary}
                </p>
              </div>

              {/* Extracted Key Metrics */}
              {analysisResult.keyMetrics.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-mono uppercase text-slate-400 font-semibold">
                    Métricas Clave Extraídas:
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {analysisResult.keyMetrics.map((met, i) => (
                      <div
                        key={i}
                        className="bg-[#090c13] border border-[#1e2538] p-2.5 rounded-lg space-y-0.5"
                      >
                        <div className="text-[10px] font-mono text-slate-400">{met.label}</div>
                        <div className="text-xs font-bold font-mono text-cyan-300">{met.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Anomalies detected */}
              {analysisResult.anomalies.length > 0 && (
                <div className="bg-[#0b0e15] border border-amber-900/40 p-3.5 rounded-lg space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 uppercase">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Anomalías & Riesgos Detectados:</span>
                  </div>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {analysisResult.anomalies.map((anom, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{anom}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Extracted Insights */}
              {analysisResult.extractedInsights.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono uppercase text-slate-400 font-semibold">
                    Hallazgos Clave:
                  </div>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {analysisResult.extractedInsights.map((ins, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-cyan-400 font-bold">•</span>
                        <span>{ins}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[300px] bg-[#0c0f16] border border-dashed border-[#1e2538] rounded-xl flex flex-col items-center justify-center p-8 text-center text-slate-500 font-mono text-xs space-y-2">
              <FileText className="w-8 h-8 text-slate-600" />
              <span>Los resultados de la auditoría y extracción aparecerán aquí tras pulsar &ldquo;Auditar Documento&rdquo;.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
