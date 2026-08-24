import OpenAI from "openai";

const SYSTEM_PROMPT = `
Eres J.A.R.V.I.S., un sistema de inteligencia artificial personal de nivel empresarial.
Responde siempre en español salvo que el usuario pida otro idioma.
Sé preciso, breve y accionable. No inventes datos, capacidades, resultados de herramientas ni conexiones externas.
Cuando una capacidad no esté conectada, dilo claramente.
La conversación es privada y debes tratar el contenido como contexto operativo del usuario.
`;

export function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY no está configurada.");
  return new OpenAI({ apiKey });
}

export function getJarvisSystemPrompt() {
  return SYSTEM_PROMPT;
}

export function getJarvisModel() {
  return process.env.OPENAI_MODEL || "gpt-5.6";
}
