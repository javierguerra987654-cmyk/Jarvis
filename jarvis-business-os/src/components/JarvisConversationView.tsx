import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Square,
  RotateCcw,
  Sparkles,
  Globe,
  Mail,
  Calendar,
  FileText,
  Table,
  ShieldCheck,
  TrendingUp,
  ExternalLink,
  Cpu,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  Activity,
  Layers,
  ChevronRight,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import {
  ConversationMessage,
  Opportunity,
  ActionProposal,
  GroundingSource,
  VoiceState,
  BusinessMemoryItem,
} from '../types.js';
import { geminiLive, LiveConnectionState } from '../lib/geminiLive.js';
import { ClapDetector, ClapSensitivity } from '../lib/clapDetector.js';
import { JarvisCore, JarvisCoreState } from './JarvisCore.js';
import { ContextualIntelligencePanel } from './ContextualIntelligencePanel.js';
import { MarkdownRenderer } from './MarkdownRenderer.js';

export type CognitiveStatus = 'READY' | 'UNDERSTANDING' | 'SEARCHING' | 'ANALYZING' | 'SYNTHESIZING';

interface JarvisConversationViewProps {
  onNavigateToCommandCenter?: () => void;
  onOpenActionProposal?: (proposal: ActionProposal) => void;
}

export const JarvisConversationView: React.FC<JarvisConversationViewProps> = ({
  onNavigateToCommandCenter,
  onOpenActionProposal,
}) => {
  const [conversationId] = useState<string>(() => `conv_${Date.now()}`);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [connectionState, setConnectionState] = useState<LiveConnectionState>('DISCONNECTED');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const [isLoading, setIsLoading] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cognitiveStatus, setCognitiveStatus] = useState<CognitiveStatus>('READY');
  const [activeToolExecution, setActiveToolExecution] = useState<string | null>(null);

  // Hands-free Clap Detection State
  const [clapDetectorActive, setClapDetectorActive] = useState<boolean>(true);
  const [clapDetectedFlash, setClapDetectedFlash] = useState<boolean>(false);
  const [clapSensitivity, setClapSensitivity] = useState<ClapSensitivity>('balanced');
  const [isClapMenuOpen, setIsClapMenuOpen] = useState<boolean>(false);
  const clapDetectorRef = useRef<ClapDetector | null>(null);
  const clapMenuRef = useRef<HTMLDivElement>(null);

  // Context Panel State
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false);
  const [currentTaskContext, setCurrentTaskContext] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentLiveModelMsgRef = useRef<ConversationMessage | null>(null);

  // Connect Gemini Live WebSocket & Initialize Clap Detector on mount
  useEffect(() => {
    fetchConversation();

    geminiLive.connect().then((connected) => {
      setIsLiveConnected(connected);
    });

    // Instantiate Clap Detector linked to greeting & LISTENING state
    const detector = new ClapDetector({
      sensitivity: clapSensitivity,
      cooldownMs: 1200,
      onClap: async (confidence: number) => {
        console.log(`[JARVIS] Transient clap sound detected! (confidence: ${confidence.toFixed(2)}). Activating greeting.`);
        setClapDetectedFlash(true);
        setTimeout(() => setClapDetectedFlash(false), 3000);

        geminiLive.playActivationChime();

        // If currently speaking, barge-in / interrupt immediately
        if (geminiLive.getVoiceState() === 'SPEAKING') {
          geminiLive.interrupt();
        }

        const greetingText = 'Hola señor, ¿cómo estás hoy? ¿Qué deseas?';

        // Add greeting message to the UI conversation log
        const greetingMsg: ConversationMessage = {
          id: `greet_${Date.now()}`,
          conversationId,
          role: 'JARVIS',
          content: greetingText,
          timestamp: new Date().toISOString(),
          status: 'completed',
        };
        setMessages((prev) => [...prev, greetingMsg]);
        setVoiceState('SPEAKING');

        // Speak greeting aloud and automatically open mic to listen for user response
        await geminiLive.playSpeech(undefined, undefined, greetingText, async () => {
          const started = await geminiLive.startAudioStream();
          if (started) {
            setVoiceState('LISTENING');
            setErrorMessage(null);
          }
        });
      },
    });

    clapDetectorRef.current = detector;
    if (clapDetectorActive) {
      detector.start().catch((e) => {
        console.warn('[JARVIS] Clap detector auto-start deferred until user gesture:', e);
      });
    }

    const unsubscribe = geminiLive.subscribe({
      onConnectionChange: (connState) => {
        setConnectionState(connState);
        setIsLiveConnected(connState === 'CONNECTED');
      },
      onVoiceStateChange: (state) => {
        setVoiceState(state);
        if (state === 'LISTENING') {
          setErrorMessage(null);
          setCognitiveStatus('UNDERSTANDING');
        } else if (state === 'THINKING') {
          setCognitiveStatus('ANALYZING');
        } else if (state === 'SPEAKING') {
          setCognitiveStatus('SYNTHESIZING');
        } else if (state === 'IDLE') {
          setCognitiveStatus('READY');
        }
      },
      onAudioLevel: (level) => {
        setAudioLevel(level);
      },
      onTranscript: (text, isFinal, role) => {
        if (role === 'user' && isFinal && text.trim()) {
          handleSendMessage(text.trim(), true);
        } else if (role === 'model') {
          setLiveTranscript((prev) => prev + text);

          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.role === 'JARVIS' && lastMsg.status === 'streaming') {
              return [
                ...prev.slice(0, -1),
                {
                  ...lastMsg,
                  content: lastMsg.content + text,
                },
              ];
            } else {
              const newMsg: ConversationMessage = {
                id: `live_model_${Date.now()}`,
                conversationId,
                role: 'JARVIS',
                content: text,
                timestamp: new Date().toISOString(),
                status: 'streaming',
              };
              currentLiveModelMsgRef.current = newMsg;
              return [...prev, newMsg];
            }
          });
        }
      },
      onInterrupted: () => {
        console.log('[JARVIS] Audio stream interrupted (barge-in)');
        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.role === 'JARVIS' && lastMsg.status === 'streaming') {
            return [
              ...prev.slice(0, -1),
              {
                ...lastMsg,
                status: 'completed',
              },
            ];
          }
          return prev;
        });
      },
      onTurnComplete: () => {
        setLiveTranscript('');
        setCognitiveStatus('READY');
        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.role === 'JARVIS' && lastMsg.status === 'streaming') {
            return [
              ...prev.slice(0, -1),
              {
                ...lastMsg,
                status: 'completed',
              },
            ];
          }
          return prev;
        });
      },
      onError: (err) => {
        setErrorMessage(err);
        setVoiceState('ERROR');
        setCognitiveStatus('READY');
      },
    });

    return () => {
      unsubscribe();
      geminiLive.disconnect();
      detector.stop();
    };
  }, [conversationId]);

  const toggleClapDetector = async () => {
    if (clapDetectorActive) {
      clapDetectorRef.current?.stop();
      setClapDetectorActive(false);
    } else {
      setClapDetectorActive(true);
      try {
        await clapDetectorRef.current?.start();
      } catch (err) {
        console.warn('[JARVIS] Microphone permission needed for clap detection:', err);
      }
    }
  };

  const handleSensitivityChange = (newSensitivity: ClapSensitivity) => {
    setClapSensitivity(newSensitivity);
    clapDetectorRef.current?.setSensitivity(newSensitivity);
    setIsClapMenuOpen(false);
  };

  // Close clap control menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clapMenuRef.current && !clapMenuRef.current.contains(event.target as Node)) {
        setIsClapMenuOpen(false);
      }
    };
    if (isClapMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isClapMenuOpen]);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveTranscript, isLoading]);

  const fetchConversation = async () => {
    try {
      const res = await fetch(`/api/jarvis/conversation/${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        }
      }
    } catch (e) {
      console.warn('Error loading initial conversation:', e);
    }
  };

  const handleSendMessage = async (textToSend: string, fromVoice: boolean = false) => {
    if (!textToSend.trim() || isLoading) return;

    setErrorMessage(null);
    setInputText('');
    setLiveTranscript('');
    setIsLoading(true);
    setCognitiveStatus('UNDERSTANDING');
    setCurrentTaskContext(textToSend);

    // Optimistic user message
    const tempUserMsg: ConversationMessage = {
      id: `user_${Date.now()}`,
      conversationId,
      role: 'USER',
      content: textToSend,
      timestamp: new Date().toISOString(),
      isVoiceInput: fromVoice,
      status: 'completed',
    };

    setMessages((prev) => [...prev, tempUserMsg]);

    // Send through Gemini Live WebSocket if connected and voice requested, or REST chat
    if (geminiLive.isConnected() && fromVoice) {
      geminiLive.sendTextMessage(textToSend);
      setIsLoading(false);
    } else {
      try {
        setCognitiveStatus('SEARCHING');

        // Check if query implies tools
        const lower = textToSend.toLowerCase();
        if (lower.includes('investiga') || lower.includes('busca') || lower.includes('google')) {
          setActiveToolExecution('Google Search');
        } else if (lower.includes('email') || lower.includes('correo') || lower.includes('gmail')) {
          setActiveToolExecution('Gmail');
        } else if (lower.includes('calendar') || lower.includes('agenda') || lower.includes('reunión')) {
          setActiveToolExecution('Google Calendar');
        } else if (lower.includes('drive') || lower.includes('archivo') || lower.includes('documento')) {
          setActiveToolExecution('Google Drive');
        }

        const res = await fetch('/api/jarvis/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            message: textToSend,
            isVoice: fromVoice,
            voiceName: selectedVoice,
          }),
        });

        setCognitiveStatus('SYNTHESIZING');

        if (!res.ok) {
          throw new Error(`Error en el servidor JARVIS: ${res.status}`);
        }

        const data = await res.json();
        setIsLoading(false);
        setActiveToolExecution(null);
        setCognitiveStatus('READY');

        if (data.message) {
          setMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
            return [...filtered, { ...tempUserMsg, status: 'completed' }, data.message];
          });

          // If there are sources or proposals, auto-expand context panel on desktop
          if (
            (data.message.groundingSources && data.message.groundingSources.length > 0) ||
            (data.message.actionProposals && data.message.actionProposals.length > 0)
          ) {
            setIsContextPanelOpen(true);
          }

          if (data.audioBase64 || fromVoice) {
            await geminiLive.playSpeech(
              data.audioBase64,
              data.audioMimeType || 'audio/pcm;rate=24000',
              data.message.content
            );
          } else {
            geminiLive.setVoiceState('IDLE');
          }
        }
      } catch (err: any) {
        setIsLoading(false);
        setActiveToolExecution(null);
        setCognitiveStatus('READY');
        setErrorMessage(err?.message || 'Error de conexión con JARVIS.');
        const errorJarvisMsg: ConversationMessage = {
          id: `err_${Date.now()}`,
          conversationId,
          role: 'JARVIS',
          content:
            'He encontrado una dificultad de red al procesar tu solicitud. Todos los módulos locales continúan activos.',
          timestamp: new Date().toISOString(),
          status: 'error',
        };
        setMessages((prev) => [...prev, errorJarvisMsg]);
      }
    }
  };

  const handleMicClick = async () => {
    // Interruption logic: If currently speaking, immediately interrupt (barge-in) and start listening
    if (voiceState === 'SPEAKING') {
      geminiLive.interrupt();
      const started = await geminiLive.startAudioStream();
      if (started) {
        setVoiceState('LISTENING');
      }
      return;
    }

    if (voiceState === 'LISTENING') {
      geminiLive.stopAudioStream();
      setVoiceState('IDLE');
    } else {
      setErrorMessage(null);
      const success = await geminiLive.startAudioStream();
      if (!success) {
        const reconnected = await geminiLive.connect();
        if (reconnected) {
          await geminiLive.startAudioStream();
        } else {
          setErrorMessage('Servicio de voz no disponible en este momento. Puedes usar modo texto.');
        }
      }
    }
  };

  const handleClearConversation = async () => {
    try {
      await fetch(`/api/jarvis/conversation/${conversationId}`, { method: 'DELETE' });
      geminiLive.stopPlayback();
      geminiLive.stopAudioStream();
      setMessages([]);
      setCurrentTaskContext(null);
      fetchConversation();
    } catch (e) {
      console.warn('Error clearing conversation:', e);
    }
  };

  // Derive core state
  const coreState: JarvisCoreState = useMemo(() => {
    if (errorMessage && voiceState === 'ERROR') return 'ERROR';
    if (activeToolExecution) return 'TOOL_EXECUTION';
    if (voiceState === 'LISTENING') return 'LISTENING';
    if (voiceState === 'SPEAKING') return 'SPEAKING';
    if (voiceState === 'THINKING' || isLoading) return 'THINKING';
    return 'IDLE';
  }, [voiceState, isLoading, activeToolExecution, errorMessage]);

  // Aggregate context info from latest messages for contextual panel
  const latestSources = useMemo(() => {
    const all: GroundingSource[] = [];
    messages.forEach((m) => {
      if (m.groundingSources) all.push(...m.groundingSources);
    });
    return all.slice(-6);
  }, [messages]);

  const latestProposals = useMemo(() => {
    const all: ActionProposal[] = [];
    messages.forEach((m) => {
      if (m.actionProposals) all.push(...m.actionProposals);
    });
    return all;
  }, [messages]);

  const allToolsEngaged = useMemo(() => {
    const set = new Set<string>();
    messages.forEach((m) => {
      if (m.toolsUsed) {
        m.toolsUsed.forEach((t) => set.add(t));
      }
    });
    return Array.from(set);
  }, [messages]);

  const quickPrompts = [
    {
      label: '¿Qué debería hacer hoy?',
      text: 'JARVIS, ¿qué debería hacer hoy? Revisa prioridades, agenda y correos.',
    },
    {
      label: 'Investiga accesorios mascotas España',
      text: 'JARVIS, investiga el mercado de accesorios para mascotas en España.',
    },
    {
      label: 'Busca emails pendientes',
      text: 'JARVIS, busca mis emails pendientes en Gmail.',
    },
    {
      label: 'Métricas de negocio y MRR',
      text: 'JARVIS, analiza el estado actual del negocio y métricas financieras.',
    },
  ];

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-screen bg-[#05070a] text-[#f5f7fa] overflow-hidden select-none font-sans">
      {/* 1. Minimal Top OS Header */}
      <header
        aria-label="Encabezado de JARVIS OS"
        className="h-14 border-b border-[#111820] bg-[#05070a]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-20 shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00d5ff] animate-pulse" />
            <span className="font-bold text-sm tracking-wider uppercase text-[#f5f7fa] font-mono">
              JARVIS
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#0b1016] text-[#00d5ff] font-mono border border-[#16202c] font-semibold">
              ● ONLINE
            </span>
          </div>

          {/* Cognitive Operational Status Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0b1016] border border-[#16202c] text-[10px] font-mono text-[#8b97a5]">
            <Activity className="w-3 h-3 text-[#00d5ff]" />
            <span>STATUS:</span>
            <span
              className={`font-bold ${
                cognitiveStatus === 'READY'
                  ? 'text-[#35d07f]'
                  : cognitiveStatus === 'UNDERSTANDING'
                  ? 'text-[#ffb84d]'
                  : cognitiveStatus === 'SEARCHING'
                  ? 'text-[#00d5ff]'
                  : cognitiveStatus === 'ANALYZING'
                  ? 'text-[#6575ff]'
                  : 'text-[#00d5ff]'
              }`}
            >
              {cognitiveStatus}
            </span>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Voice Selector */}
          <div className="hidden lg:flex items-center gap-1 bg-[#0b1016] border border-[#16202c] rounded-md px-2 py-1 text-xs text-[#8b97a5]">
            <select
              aria-label="Seleccionar voz de JARVIS"
              value={selectedVoice}
              onChange={(e) => {
                setSelectedVoice(e.target.value);
                geminiLive.setVoice(e.target.value);
              }}
              className="bg-transparent border-none text-[#f5f7fa] text-[11px] font-mono focus:outline-none cursor-pointer"
            >
              <option value="Zephyr" className="bg-[#0b1016] text-[#f5f7fa]">Voz: Zephyr</option>
              <option value="Fenrir" className="bg-[#0b1016] text-[#f5f7fa]">Voz: Fenrir</option>
              <option value="Kore" className="bg-[#0b1016] text-[#f5f7fa]">Voz: Kore</option>
              <option value="Puck" className="bg-[#0b1016] text-[#f5f7fa]">Voz: Puck</option>
              <option value="Charon" className="bg-[#0b1016] text-[#f5f7fa]">Voz: Charon</option>
            </select>
          </div>

          {/* Hands-free Clap Detector Control Group with Sensitivity Menu */}
          <div className="relative" ref={clapMenuRef}>
            <div className="flex items-center rounded-lg border border-[#16202c] bg-[#0b1016] p-0.5 shadow-sm">
              {/* Clap Toggle Button */}
              <button
                onClick={toggleClapDetector}
                title={clapDetectorActive ? 'Detección por aplauso activa (Click para desactivar)' : 'Activar detección por aplauso'}
                aria-label="Alternar detección de aplauso"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all ${
                  clapDetectorActive
                    ? clapDetectedFlash
                      ? 'bg-amber-500/30 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)] animate-pulse'
                      : 'bg-[#00d5ff]/15 text-[#00d5ff]'
                    : 'text-[#8b97a5] hover:text-[#f5f7fa]'
                }`}
              >
                <span>👏</span>
                <span className="hidden sm:inline text-[11px]">
                  {clapDetectorActive ? (clapDetectedFlash ? '¡APLAUSO!' : 'CLAP') : 'CLAP OFF'}
                </span>
              </button>

              {/* Sensitivity Menu Trigger */}
              <button
                onClick={() => setIsClapMenuOpen((prev) => !prev)}
                title="Configurar sensibilidad de aplauso"
                aria-label="Configurar sensibilidad de aplauso"
                aria-expanded={isClapMenuOpen}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono transition-colors border-l border-[#16202c] ${
                  isClapMenuOpen
                    ? 'bg-[#111820] text-[#00d5ff]'
                    : 'text-[#8b97a5] hover:text-[#f5f7fa] hover:bg-[#111820]'
                }`}
              >
                <SlidersHorizontal className="w-3 h-3 text-[#00d5ff]" />
                <span className="hidden md:inline capitalize">{clapSensitivity}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isClapMenuOpen ? 'rotate-180 text-[#00d5ff]' : ''}`} />
              </button>
            </div>

            {/* Sensitivity Dropdown Control Menu */}
            {isClapMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-64 p-2 rounded-xl bg-[#0b1016] border border-[#1e2a38] shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#16202c] px-1">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-[#f5f7fa]">
                    <span>👏</span>
                    <span className="font-semibold">Sensibilidad de Aplauso</span>
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    clapDetectorActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {clapDetectorActive ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </div>

                <div className="space-y-1">
                  {([
                    {
                      id: 'low' as ClapSensitivity,
                      label: 'Baja (Low)',
                      threshold: 'RMS: 0.48 / Peak: 0.72',
                      desc: 'Para entornos con ruido o conversaciones de fondo',
                    },
                    {
                      id: 'balanced' as ClapSensitivity,
                      label: 'Equilibrada (Balanced)',
                      threshold: 'RMS: 0.38 / Peak: 0.62',
                      desc: 'Ajuste recomendado para uso estándar',
                    },
                    {
                      id: 'high' as ClapSensitivity,
                      label: 'Alta (High)',
                      threshold: 'RMS: 0.28 / Peak: 0.52',
                      desc: 'Para palmadas suaves o mayor distancia del micrófono',
                    },
                  ]).map((item) => {
                    const isSelected = clapSensitivity === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSensitivityChange(item.id)}
                        className={`w-full text-left p-2 rounded-lg transition-all flex items-start justify-between group ${
                          isSelected
                            ? 'bg-[#00d5ff]/15 border border-[#00d5ff]/40 text-[#f5f7fa]'
                            : 'hover:bg-[#111820] border border-transparent text-[#8b97a5] hover:text-[#f5f7fa]'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-medium ${isSelected ? 'text-[#00d5ff] font-semibold' : 'group-hover:text-[#f5f7fa]'}`}>
                              {item.label}
                            </span>
                            {isSelected && (
                              <span className="text-[9px] font-mono bg-[#00d5ff]/20 text-[#00d5ff] px-1 rounded">
                                ACTUAL
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#8b97a5] leading-tight">
                            {item.desc}
                          </p>
                          <p className="text-[9px] font-mono text-[#4e5c6e]">
                            {item.threshold}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#00d5ff] shrink-0 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Quick Toggle Detector inside Menu */}
                <div className="mt-2 pt-2 border-t border-[#16202c]">
                  <button
                    onClick={toggleClapDetector}
                    className={`w-full py-1.5 px-2 rounded-lg text-xs font-mono flex items-center justify-center gap-1.5 transition-colors ${
                      clapDetectorActive
                        ? 'bg-[#111820] text-[#8b97a5] hover:text-red-400 hover:bg-red-500/10'
                        : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                    }`}
                  >
                    <span>{clapDetectorActive ? 'Desactivar detector' : 'Activar detector'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Reset Conversation */}
          <button
            onClick={handleClearConversation}
            title="Reiniciar conversación"
            aria-label="Reiniciar conversación"
            className="p-2 rounded-lg bg-[#0b1016] border border-[#16202c] text-[#8b97a5] hover:text-[#f5f7fa] hover:bg-[#111820] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Toggle Context Intelligence Panel */}
          <button
            onClick={() => setIsContextPanelOpen((prev) => !prev)}
            aria-label="Alternar panel de contexto inteligente"
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
              isContextPanelOpen
                ? 'bg-[#00d5ff]/15 border-[#00d5ff]/40 text-[#00d5ff]'
                : 'bg-[#0b1016] border-[#16202c] text-[#8b97a5] hover:text-[#f5f7fa]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>CONTEXT</span>
          </button>

          {/* Mission Control Jump */}
          {onNavigateToCommandCenter && (
            <button
              onClick={onNavigateToCommandCenter}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111820] hover:bg-[#16202c] border border-[#1e2a38] text-xs font-medium text-[#f5f7fa] shadow-sm transition-all"
            >
              <Layers className="w-3.5 h-3.5 text-[#00d5ff]" />
              <span className="hidden sm:inline">Mission Control</span>
              <ArrowRight className="w-3 h-3 text-[#8b97a5]" />
            </button>
          )}
        </div>
      </header>

      {/* 2. Main Conversational Body */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#05070a]">
          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-rose-950/60 border-b border-rose-800/60 px-4 py-2 text-xs text-[#ff5c70] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#ff5c70] shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-[#ff5c70] hover:text-rose-200 text-xs font-mono"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* Active Tool Execution Live Status Badge */}
          {activeToolExecution && (
            <div className="bg-[#111820]/90 border-b border-[#00d5ff]/30 px-4 py-2 text-xs text-[#00d5ff] flex items-center gap-2.5 shrink-0 font-mono animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>EJECUTANDO HERRAMIENTA:</span>
              <span className="font-bold text-[#f5f7fa] uppercase">{activeToolExecution}</span>
            </div>
          )}

          {/* MAIN STAGE */}
          {!hasMessages ? (
            /* HOME = CONVERSATION (Spacious Hero Landing) */
            <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-6 text-center max-w-3xl mx-auto w-full">
              {/* Central Holographic Core */}
              <div className="my-6">
                <JarvisCore
                  state={coreState}
                  audioLevel={audioLevel}
                  activeToolName={activeToolExecution}
                  size="lg"
                  onClick={handleMicClick}
                />
              </div>

              {/* Central Invitation */}
              <div className="space-y-2 mb-8">
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#f5f7fa]">
                  ¿En qué puedo ayudarte?
                </h2>
                <p className="text-xs sm:text-sm text-[#8b97a5] max-w-md mx-auto leading-relaxed">
                  Sistema operativo conversacional conectado a Google Search, Workspace, herramientas analíticas y gobernanza HITL.
                </p>
              </div>

              {/* Primary Action Button: TALK TO JARVIS */}
              <button
                id="btn_talk_to_jarvis_hero"
                onClick={handleMicClick}
                aria-label="Hablar con JARVIS mediante voz en tiempo real"
                className={`py-3.5 px-8 rounded-full font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-xl mb-8 cursor-pointer ${
                  voiceState === 'LISTENING'
                    ? 'bg-[#ffb84d] hover:bg-amber-400 text-[#05070a] shadow-amber-500/30 ring-4 ring-amber-500/20'
                    : voiceState === 'SPEAKING'
                    ? 'bg-[#ff5c70] hover:bg-rose-500 text-white shadow-rose-500/30 ring-4 ring-rose-500/20'
                    : 'bg-[#00d5ff] hover:bg-cyan-300 text-[#05070a] shadow-cyan-500/20 hover:shadow-cyan-500/35'
                }`}
              >
                {voiceState === 'LISTENING' ? (
                  <>
                    <Square className="w-4 h-4 fill-current" />
                    <span>PAUSAR MICRÓFONO</span>
                  </>
                ) : voiceState === 'SPEAKING' ? (
                  <>
                    <Square className="w-4 h-4 fill-current" />
                    <span>INTERRUMPIR AUDIO</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>TALK TO JARVIS</span>
                  </>
                )}
              </button>

              {/* Hands-free clap hint */}
              {clapDetectorActive && (
                <button
                  onClick={() => setIsClapMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 text-[11px] font-mono text-[#8b97a5] hover:text-[#00d5ff] -mt-5 mb-7 bg-[#0b1016]/90 hover:bg-[#111820] px-3.5 py-1.5 rounded-full border border-[#16202c] hover:border-[#00d5ff]/40 transition-all cursor-pointer shadow-sm group"
                >
                  <span className="group-hover:scale-110 transition-transform">👏</span>
                  <span>Modo manos libres: aplaude para hablar</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#16202c] text-[#00d5ff] uppercase font-mono">
                    Sens: {clapSensitivity}
                  </span>
                </button>
              )}

              {/* Quick Prompts */}
              <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {quickPrompts.map((qp, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(qp.text, false)}
                    className="p-3 rounded-lg bg-[#0b1016] hover:bg-[#111820] border border-[#16202c] hover:border-[#00d5ff]/40 text-xs text-[#8b97a5] hover:text-[#f5f7fa] transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <span className="truncate pr-2">{qp.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#00d5ff] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ACTIVE CONVERSATION FEED */
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-4xl mx-auto w-full">
              {/* Compact Core Indicator during active conversation */}
              <div className="flex items-center justify-center py-2 border-b border-[#111820]">
                <JarvisCore
                  state={coreState}
                  audioLevel={audioLevel}
                  activeToolName={activeToolExecution}
                  size="sm"
                  onClick={handleMicClick}
                />
              </div>

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col space-y-2.5 ${
                    msg.role === 'USER' ? 'items-end' : 'items-start'
                  }`}
                >
                  {/* Speaker Label & Timestamp */}
                  <div className="flex items-center gap-2 text-[11px] font-mono text-[#8b97a5] px-1">
                    <span
                      className={`font-bold ${
                        msg.role === 'USER' ? 'text-[#6575ff]' : 'text-[#00d5ff]'
                      }`}
                    >
                      {msg.role === 'USER' ? 'USER' : 'JARVIS'}
                    </span>
                    {msg.isVoiceInput && (
                      <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.2 rounded bg-amber-950/60 text-[#ffb84d] border border-amber-800/40">
                        <Mic className="w-2.5 h-2.5" /> VOICE
                      </span>
                    )}
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Clean Text Presentation (NO bulky bubble styling) */}
                  <div
                    className={`w-full max-w-3xl rounded-xl p-4 transition-all border ${
                      msg.role === 'USER'
                        ? 'bg-[#0b1016] border-[#1e2a38] text-[#f5f7fa]'
                        : 'bg-[#0b1016] border-[#16202c] text-[#f5f7fa]'
                    }`}
                  >
                    <MarkdownRenderer content={msg.content} />

                    {/* Real Tool Execution Badges & Output Summary */}
                    {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-[#16202c] flex flex-wrap gap-2">
                        {msg.toolsUsed.map((tool, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#111820] border border-[#1e2a38] text-[11px] font-mono text-[#00d5ff]"
                          >
                            {tool.includes('googleSearch') && <Globe className="w-3 h-3 text-[#00d5ff]" />}
                            {tool.includes('searchEmails') && <Mail className="w-3 h-3 text-[#ffb84d]" />}
                            {tool.includes('getUpcomingEvents') && <Calendar className="w-3 h-3 text-[#35d07f]" />}
                            {tool.includes('searchDrive') && <FileText className="w-3 h-3 text-[#6575ff]" />}
                            {tool.includes('listSpreadsheets') && <Table className="w-3 h-3 text-[#35d07f]" />}
                            <span>{tool}</span>
                            <span className="text-[#35d07f] font-bold">✓ Completed</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Verified Grounding Sources Cards */}
                    {msg.groundingSources && msg.groundingSources.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-[#16202c] space-y-1.5">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-[#8b97a5] flex items-center gap-1.5">
                          <Globe className="w-3 h-3 text-[#00d5ff]" />
                          <span>Fuentes Verificadas ({msg.groundingSources.length}):</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.groundingSources.map((src, sIdx) => (
                            <a
                              key={sIdx}
                              href={src.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#111820] hover:bg-[#162230] border border-[#1e2a38] hover:border-[#00d5ff]/40 text-[#00d5ff] text-[11px] transition-all"
                            >
                              <span className="truncate max-w-[200px]">{src.title || src.uri}</span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Inline Action Proposals (System Operation Cards) */}
                    {msg.actionProposals && msg.actionProposals.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-[#16202c] space-y-2">
                        {msg.actionProposals.map((prop) => (
                          <div
                            key={prop.id}
                            className="bg-[#111820] border border-[#ffb84d]/40 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold rounded bg-amber-950/70 text-[#ffb84d] border border-amber-800/50">
                                  {prop.risk} RISK
                                </span>
                                <span className="text-xs font-semibold text-[#f5f7fa]">
                                  {prop.title}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#8b97a5]">{prop.reason}</p>
                            </div>
                            {onOpenActionProposal && (
                              <button
                                onClick={() => onOpenActionProposal(prop)}
                                className="px-3 py-1.5 rounded bg-[#ffb84d] hover:bg-amber-400 text-[#05070a] font-bold text-xs uppercase tracking-wide transition-colors shrink-0 cursor-pointer"
                              >
                                Review Action
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inline Detected Opportunities */}
                    {msg.detectedOpportunities && msg.detectedOpportunities.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-[#16202c] space-y-2">
                        {msg.detectedOpportunities.map((opp) => (
                          <div
                            key={opp.id}
                            className="bg-[#111820] border border-[#35d07f]/40 rounded-lg p-3 flex items-center justify-between gap-3"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold rounded bg-emerald-950/70 text-[#35d07f] border border-emerald-800/50">
                                  {opp.category}
                                </span>
                                <span className="text-xs font-semibold text-[#f5f7fa]">
                                  {opp.title}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#8b97a5] mt-0.5">{opp.reason}</p>
                            </div>
                            <span className="text-[10px] font-mono text-[#35d07f] font-bold shrink-0">
                              {opp.estimatedImpact}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Streaming or Loading State */}
              {isLoading && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#0b1016] border border-[#16202c] text-xs text-[#8b97a5] font-mono">
                  <RefreshCw className="w-4 h-4 text-[#00d5ff] animate-spin" />
                  <span>JARVIS está procesando con Gemini 3.7 y herramientas activas...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* 3. Bottom Conversation Control Bar */}
          <div className="p-3 sm:p-4 border-t border-[#111820] bg-[#05070a]/95 backdrop-blur-md shrink-0">
            <div className="max-w-4xl mx-auto flex items-center gap-2">
              {/* Mic / Voice Button */}
              <button
                id="btn_mic_input_bar"
                onClick={handleMicClick}
                aria-label="Hablar con JARVIS mediante voz en tiempo real"
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  voiceState === 'LISTENING'
                    ? 'bg-[#ffb84d] text-[#05070a] border-amber-400 ring-2 ring-amber-400/30'
                    : voiceState === 'SPEAKING'
                    ? 'bg-[#ff5c70] text-white border-rose-500'
                    : 'bg-[#0b1016] border-[#1e2a38] text-[#00d5ff] hover:bg-[#111820]'
                }`}
                title={
                  voiceState === 'SPEAKING'
                    ? 'Interrumpir audio'
                    : voiceState === 'LISTENING'
                    ? 'Pausar micrófono'
                    : 'Hablar con JARVIS'
                }
              >
                {voiceState === 'LISTENING' ? (
                  <MicOff className="w-5 h-5" />
                ) : voiceState === 'SPEAKING' ? (
                  <Square className="w-5 h-5 fill-current" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>

              {/* Input Field */}
              <input
                id="input_jarvis_conversation"
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(inputText, false);
                  }
                }}
                placeholder="Habla con JARVIS..."
                disabled={isLoading}
                className="flex-1 bg-[#0b1016] border border-[#1e2a38] rounded-xl px-4 py-3 text-sm text-[#f5f7fa] placeholder-[#8b97a5] focus:outline-none focus:border-[#00d5ff] focus:ring-1 focus:ring-[#00d5ff]"
              />

              {/* Send Button */}
              <button
                id="btn_send_jarvis_message"
                onClick={() => handleSendMessage(inputText, false)}
                disabled={!inputText.trim() || isLoading}
                aria-label="Enviar mensaje a JARVIS"
                className="p-3 rounded-xl bg-[#00d5ff] hover:bg-cyan-300 disabled:bg-[#111820] disabled:text-[#8b97a5] text-[#05070a] font-bold transition-all shadow-md disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
                title="Enviar mensaje"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 4. Contextual Intelligence Panel (Desktop Right Side) */}
        <ContextualIntelligencePanel
          isOpen={isContextPanelOpen}
          onToggle={() => setIsContextPanelOpen((prev) => !prev)}
          currentTask={currentTaskContext}
          activeTools={allToolsEngaged}
          groundingSources={latestSources}
          actionProposals={latestProposals}
          onOpenProposal={onOpenActionProposal}
        />
      </div>
    </div>
  );
};
