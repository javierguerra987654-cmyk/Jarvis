export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      jarvis_memory: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          category: string;
          importance: number;
          embedding: number[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          category: string;
          importance?: number;
          embedding?: number[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string;
          category?: string;
          importance?: number;
          embedding?: number[] | null;
          created_at?: string;
        };
      };
      jarvis_audit: {
        Row: {
          id: string;
          request_id: string;
          user_id: string | null;
          action: string;
          status: "started" | "success" | "error";
          detail: string | null;
          latency_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          user_id?: string | null;
          action: string;
          status: "started" | "success" | "error";
          detail?: string | null;
          latency_ms?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["jarvis_audit"]["Insert"]>;
      };
    };
  };
}
