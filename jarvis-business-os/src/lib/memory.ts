export type MemoryRecord = {
  id: string;
  userId: string;
  content: string;
  category: "fact" | "preference" | "goal" | "context";
  importance: number;
  createdAt: string;
};

export interface JarvisMemoryStore {
  search(userId: string, query: string, limit?: number): Promise<MemoryRecord[]>;
  save(record: Omit<MemoryRecord, "id" | "createdAt">): Promise<MemoryRecord>;
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
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

export function createMemoryStore(): JarvisMemoryStore {
  return {
    async search(userId, query, limit = 8) {
      if (!getSupabaseConfig()) return [];
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
      const response = await supabaseRequest("jarvis_memory", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          user_id: record.userId,
          content: record.content,
          category: record.category,
          importance: record.importance,
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
