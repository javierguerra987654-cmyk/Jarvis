import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { WebSocket, WebSocketServer } from 'ws';
import { storage } from './storage.js';

let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    aiClient = new GoogleGenAI({
      apiKey: apiKey || 'dummy-key',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export function setupLiveWebSocket(wss: WebSocketServer) {
  wss.on('connection', async (clientWs: WebSocket, req) => {
    console.log('[Live API] Client connected to live WebSocket');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[Live API] GEMINI_API_KEY is not configured.');
      clientWs.send(
        JSON.stringify({
          type: 'error',
          error: 'GEMINI_API_KEY no está configurada en el servidor. Configúrala en Settings > Secrets.',
        })
      );
      return;
    }

    let session: any = null;
    let isSessionOpen = false;
    let selectedVoice = 'Zephyr';
    const conversationId = `live_session_${Date.now()}`;

    // Get business memory context & system state for live session
    const memoryContext = storage
      .getMemory('ALL')
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
3. Si el usuario te interrumpe, el flujo se detiene de inmediato.
4. Mantén memoria del contexto de la conversación.
5. Tienes acceso a los datos de negocio:
   - MRR: $${systemState.metrics.mrr.toLocaleString()} | Crecimiento: +${systemState.metrics.revenueGrowthPct}% | Salud: ${systemState.metrics.healthScore}%
   - Conversión: ${systemState.metrics.conversionRate}% | Churn: ${systemState.metrics.churnRate}%
6. Memoria Empresarial:
${memoryContext}
`;

    async function initLiveSession(voice: string = 'Zephyr') {
      try {
        const ai = getGenAI();

        session = await ai.live.connect({
          model: 'gemini-3.1-flash-live-preview',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice || 'Zephyr' },
              },
            },
            systemInstruction: systemInstruction,
          },
          callbacks: {
            onmessage: (message: LiveServerMessage) => {
              if (clientWs.readyState !== WebSocket.OPEN) return;

              // Check for model audio output
              const parts = message.serverContent?.modelTurn?.parts;
              if (parts && parts.length > 0) {
                for (const part of parts) {
                  if (part.inlineData?.data) {
                    clientWs.send(
                      JSON.stringify({
                        type: 'audio',
                        audio: part.inlineData.data,
                        mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000',
                      })
                    );
                  }
                  if (part.text) {
                    clientWs.send(
                      JSON.stringify({
                        type: 'text',
                        text: part.text,
                      })
                    );
                  }
                }
              }

              // Handle interruption notification from server
              if (message.serverContent?.interrupted) {
                clientWs.send(JSON.stringify({ type: 'interrupted', interrupted: true }));
              }

              // Handle turn completion
              if (message.serverContent?.turnComplete) {
                clientWs.send(JSON.stringify({ type: 'turnComplete' }));
              }
            },
            onclose: () => {
              console.log('[Live API] Gemini Live session closed');
              isSessionOpen = false;
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({ type: 'sessionClosed' }));
              }
            },
            onerror: (err: any) => {
              console.error('[Live API] Gemini Live session error:', err);
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(
                  JSON.stringify({
                    type: 'error',
                    error: err?.message || 'Error en la sesión Gemini Live API',
                  })
                );
              }
            },
          },
        });

        isSessionOpen = true;
        console.log('[Live API] Connected successfully to gemini-3.1-flash-live-preview');
        clientWs.send(
          JSON.stringify({
            type: 'connected',
            conversationId,
            voiceName: voice,
            sampleRateInput: 16000,
            sampleRateOutput: 24000,
          })
        );
      } catch (err: any) {
        console.error('[Live API] Failed to initialize Gemini Live API session:', err);
        isSessionOpen = false;
        clientWs.send(
          JSON.stringify({
            type: 'error',
            error: `No se pudo conectar a Gemini Live API: ${err?.message || 'Error desconocido'}.`,
          })
        );
      }
    }

    // Initialize the live session on connection
    await initLiveSession(selectedVoice);

    clientWs.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'audio' && msg.audio) {
          if (session && isSessionOpen) {
            session.sendRealtimeInput({
              audio: {
                data: msg.audio,
                mimeType: 'audio/pcm;rate=16000',
              },
            });
          }
        } else if (msg.type === 'text' && msg.text) {
          if (session && isSessionOpen) {
            session.send({
              clientContent: {
                turns: [
                  {
                    role: 'user',
                    parts: [{ text: msg.text }],
                  },
                ],
                turnComplete: true,
              },
            });
          }
        } else if (msg.type === 'changeVoice' && msg.voiceName) {
          selectedVoice = msg.voiceName;
          if (session) {
            try {
              session.close();
            } catch (e) {
              // ignore
            }
          }
          await initLiveSession(selectedVoice);
        } else if (msg.type === 'ping') {
          clientWs.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (e: any) {
        console.error('[Live API] Error processing client message:', e);
      }
    });

    clientWs.on('close', () => {
      console.log('[Live API] Client disconnected');
      if (session) {
        try {
          session.close();
        } catch (e) {
          // ignore
        }
      }
      isSessionOpen = false;
    });

    clientWs.on('error', (err) => {
      console.error('[Live API] Client WebSocket error:', err);
    });
  });
}
