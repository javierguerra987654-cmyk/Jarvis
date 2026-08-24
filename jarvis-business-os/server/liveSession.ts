import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { WebSocket, WebSocketServer } from 'ws';
import { storage } from './storage.js';

const MAX_TEXT_LENGTH = 8000;
const MAX_AUDIO_BASE64_LENGTH = 2 * 1024 * 1024;
const ALLOWED_VOICES = new Set(['Zephyr', 'Kore', 'Puck', 'Charon', 'Fenrir', 'Leda', 'Aoede']);

let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY no está configurada en el servidor.');
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
  }
  return aiClient;
}

function safeSend(clientWs: WebSocket, payload: Record<string, unknown>) {
  if (clientWs.readyState === WebSocket.OPEN) {
    clientWs.send(JSON.stringify(payload));
  }
}

export function setupLiveWebSocket(wss: WebSocketServer) {
  wss.on('connection', async (clientWs: WebSocket) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      safeSend(clientWs, {
        type: 'error',
        code: 'GEMINI_API_KEY_MISSING',
        error: 'GEMINI_API_KEY no está configurada en el servidor. Configúrala en Secrets.',
      });
      clientWs.close(1011, 'Gemini API key missing');
      return;
    }

    let session: any = null;
    let isSessionOpen = false;
    let selectedVoice = 'Zephyr';
    let closed = false;
    const conversationId = `live_session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const memoryContext = storage
      .getMemory('ALL')
      .filter((m) => m.dataSource !== 'DEMO')
      .slice(0, 6)
      .map((m) => `[${m.category}] ${m.title}: ${m.content}`)
      .join('\n');
    const systemState = storage.getSystemState();

    const systemInstruction = `
Eres JARVIS, el Sistema Operativo Empresarial e Inteligencia Artificial Conversacional de alto nivel.
Estás conectado en tiempo real bidireccional mediante voz de baja latencia con el usuario.

Directivas de Voz en Tiempo Real:
1. Responde de forma concisa, fluida, natural y directa al grano en español.
2. NUNCA uses introducciones cliché como "Claro", "Por supuesto", "Entendido", "¡Hola!".
3. Si el usuario te interrumpe, detén la respuesta y continúa con el nuevo turno.
4. Mantén el contexto de la conversación únicamente durante esta sesión.
5. Nunca inventes datos de negocio. Distingue hechos verificables de estimaciones.
6. Los datos disponibles actualmente son:
   - MRR: ${systemState.metrics.mrr.toLocaleString()} | Crecimiento: ${systemState.metrics.revenueGrowthPct}% | Salud: ${systemState.metrics.healthScore}%
   - Conversión: ${systemState.metrics.conversionRate}% | Churn: ${systemState.metrics.churnRate}%
7. Memoria Empresarial verificable:\n${memoryContext || '(No hay memoria empresarial REAL disponible.)'}
`;

    async function closeGeminiSession() {
      isSessionOpen = false;
      if (session) {
        const current = session;
        session = null;
        try { current.close(); } catch { /* noop */ }
      }
    }

    async function initLiveSession(voice: string) {
      await closeGeminiSession();
      if (closed) return;

      const normalizedVoice = ALLOWED_VOICES.has(voice) ? voice : 'Zephyr';
      try {
        const ai = getGenAI();
        session = await ai.live.connect({
          model: 'gemini-3.1-flash-live-preview',
          config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: normalizedVoice },
              },
            },
            systemInstruction,
          },
          callbacks: {
            onmessage: (message: LiveServerMessage) => {
              if (clientWs.readyState !== WebSocket.OPEN) return;

              const inputTranscription = message.serverContent?.inputTranscription;
              if (inputTranscription?.text) {
                safeSend(clientWs, {
                  type: 'inputTranscript',
                  text: inputTranscription.text,
                  isFinal: inputTranscription.finished === true,
                });
              }

              const parts = message.serverContent?.modelTurn?.parts;
              if (parts?.length) {
                for (const part of parts) {
                  if (part.inlineData?.data) {
                    safeSend(clientWs, {
                      type: 'audio',
                      audio: part.inlineData.data,
                      mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000',
                    });
                  }
                  if (part.text) {
                    safeSend(clientWs, { type: 'text', text: part.text });
                  }
                }
              }

              if (message.serverContent?.interrupted) {
                safeSend(clientWs, { type: 'interrupted', interrupted: true });
              }
              if (message.serverContent?.turnComplete) {
                safeSend(clientWs, { type: 'turnComplete' });
              }
            },
            onclose: () => {
              isSessionOpen = false;
              if (!closed) safeSend(clientWs, { type: 'sessionClosed' });
            },
            onerror: (err: any) => {
              console.error('[Live API] Gemini Live session error:', err);
              isSessionOpen = false;
              safeSend(clientWs, {
                type: 'error',
                code: 'GEMINI_LIVE_ERROR',
                error: err?.message || 'Error en la sesión Gemini Live API',
              });
            },
          },
        });

        isSessionOpen = true;
        safeSend(clientWs, {
          type: 'connected',
          conversationId,
          voiceName: normalizedVoice,
          sampleRateInput: 16000,
          sampleRateOutput: 24000,
        });
      } catch (err: any) {
        isSessionOpen = false;
        safeSend(clientWs, {
          type: 'error',
          code: 'GEMINI_LIVE_CONNECT_FAILED',
          error: `No se pudo conectar a Gemini Live API: ${err?.message || 'Error desconocido'}.`,
        });
      }
    }

    await initLiveSession(selectedVoice);

    clientWs.on('message', async (data) => {
      try {
        const raw = data.toString();
        if (raw.length > MAX_AUDIO_BASE64_LENGTH + 512) {
          safeSend(clientWs, { type: 'error', code: 'MESSAGE_TOO_LARGE', error: 'Mensaje demasiado grande.' });
          return;
        }

        const msg = JSON.parse(raw);

        if (msg.type === 'audio') {
          if (typeof msg.audio !== 'string' || msg.audio.length === 0 || msg.audio.length > MAX_AUDIO_BASE64_LENGTH) return;
          if (session && isSessionOpen) {
            session.sendRealtimeInput({
              audio: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' },
            });
          }
          return;
        }

        if (msg.type === 'text') {
          if (typeof msg.text !== 'string') return;
          const text = msg.text.trim();
          if (!text || text.length > MAX_TEXT_LENGTH) {
            safeSend(clientWs, { type: 'error', code: 'TEXT_TOO_LARGE', error: `El texto debe tener entre 1 y ${MAX_TEXT_LENGTH} caracteres.` });
            return;
          }
          if (session && isSessionOpen) {
            session.send({
              clientContent: {
                turns: [{ role: 'user', parts: [{ text }] }],
                turnComplete: true,
              },
            });
          }
          return;
        }

        if (msg.type === 'changeVoice') {
          if (typeof msg.voiceName !== 'string') return;
          selectedVoice = ALLOWED_VOICES.has(msg.voiceName) ? msg.voiceName : 'Zephyr';
          await initLiveSession(selectedVoice);
          return;
        }

        if (msg.type === 'ping') {
          safeSend(clientWs, { type: 'pong' });
        }
      } catch (e: any) {
        console.error('[Live API] Error processing client message:', e);
        safeSend(clientWs, { type: 'error', code: 'INVALID_MESSAGE', error: 'Mensaje WebSocket no válido.' });
      }
    });

    clientWs.on('close', async () => {
      closed = true;
      await closeGeminiSession();
    });

    clientWs.on('error', (err) => {
      console.error('[Live API] Client WebSocket error:', err);
    });
  });
}
