import OpenAI from "openai";

export type MemoryRecord = {
  id: string;
  userId: string;
  content: string;
  category: "fact" | "preference" | "goal" | "context";
  importance: number;
  createdAt: string;
  score?: number;
};

export interface JarvisMemoryStore {
  list(userId: string, limit?: number): Promise<MemoryRecord[]>;
  search(userId: string, query: string, limit?: number): Promise<MemoryRecord[]>;
  save(record: Omit<MemoryRecord, "id" | "createdAt" | "score">): Promise<MemoryRecord>;
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY no está configurada para memoria semántica.");
  return new OpenAI({ apiKey: key });
}

async function supabaseRequest(path: string, init: RequestInit = {}) {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase no está configurado para memoria persistente.");

  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Supabase memory error ${response.status}: ${detail.slice(0, 500)}`);
  }
  return response;
}

async function embed(text: string) {
  const response = await getOpenAI().embeddings.create({
    model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
    input: text.slice(0, 8000),
  });
  return response.data[0]?.embedding ?? null;
}

export function createMemoryStore(): JarvisMemoryStore {
  return {
    async list(userId, limit = 12) {
      if (!getSupabaseConfig()) return [];
      const params = new URLSearchParams({
        select: "id,user_id,content,category,importance,created_at",
        user_id: `eq.${userId}`,
        order: "created_at.desc",
        limit: String(Math.min(Math.max(limit, 1), 50)),
      });
      const response = await supabaseRequest(`jarvis_memory?${params.toString()}`);
      const rows = (await response.json()) as Array<{
        id: string;
        user_id: string;
        content: string;
        category: MemoryRecord["category"];
        importance: number;
        created_at: string;
      }>;
      return rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        content: row.content,
        category: row.category,
        importance: Number(row.importance),
        createdAt: row.created_at,
      }));
    },

    async search(userId, query, limit = 8) {
      if (!getSupabaseConfig()) return [];
      const vector = await embed(query);

      if (vector) {
        try {
          const response = await supabaseRequest("rpc/match_jarvis_memory", {
            method: "POST",
            body: JSON.stringify({
              query_embedding: vector,
              match_user_id: userId,
              match_threshold: 0.18,
              match_count: Math.min(Math.max(limit, 1), 50),
            }),
          });
          const rows = (await response.json()) as Array<{
            id: string;
            user_id: string;
            content: string;
            category: MemoryRecord["category"];
            importance: number;
            created_at: string;
            similarity: number;
          }>;
          if (rows.length) {
            return rows.map((row) => ({
              id: row.id,
              userId: row.user_id,
              content: row.content,
              category: row.category,
              importance: Number(row.importance),
              createdAt: row.created_at,
              score: Number(row.similarity),
            }));
          }
        } catch {
          // Fall back to lexical search below when vector search is unavailable.
        }
      }

      const params = new URLSearchParams({
        select: "id,user_id,content,category,importance,created_at",
        user_id: `eq.${userId}`,
        content: `ilike.*${query.replace(/[*%]/g, "").slice(0, 200)}*`,
        order: "created_at.desc",
        limit: String(Math.min(Math.max(limit, 1), 50)),
      });
      const response = await supabaseRequest(`jarvis_memory?${params.toString()}`);
      const rows = (await response.json()) as Array<{
        id: string;
        user_id: string;
        content: string;
        category: MemoryRecord["category"];
        importance: number;
        created_at: string;
      }>;
      return rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        content: row.content,
        category: row.category,
        importance: Number(row.importance),
        createdAt: row.created_at,
      }));
    },

    async save(record) {
      const embedding = await embed(record.content).catch(() => null);
      const response = await supabaseRequest("jarvis_memory", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          user_id: record.userId,
          content: record.content,
          category: record.category,
          importance: record.importance,
          embedding,
        }),
      });
      const [row] = (await response.json()) as Array<{
        id: string;
        user_id: string;
        content: string;
        category: MemoryRecord["category"];
        importance: number;
        created_at: string;
      }>;
      if (!row) throw new Error("Supabase no devolvió la memoria creada.");
      return {
        id: row.id,
        userId: row.user_id,
        content: row.content,
        category: row.category,
        importance: Number(row.importance),
        createdAt: row.created_at,
      };
    },
  };
}

export const memoryStore = createMemoryStore();
