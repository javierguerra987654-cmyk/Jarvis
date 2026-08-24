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

export function createMemoryStore(): JarvisMemoryStore {
  return {
    async search() {
      return [];
    },
    async save(record) {
      return {
        ...record,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
    },
  };
}

export const memoryStore = createMemoryStore();
