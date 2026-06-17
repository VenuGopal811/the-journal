/* ─── Domain Types ─── */

export interface Entry {
  id: number;
  date: string;
  timestamp: string;
  role: "user" | "assistant";
  content: string;
}

export interface DateGroup {
  date: string;
  entry_count: number;
  entries: Entry[];
}

export interface RecentDay {
  date: string;
  entry_count: number;
}

export interface ChatResponse {
  response: string;
  entry_id: number;
}

export interface SearchResult {
  content: string;
  date: string;
  role: string;
  entry_id: string;
  relevance: number;
}

/* ─── Chat Message (UI-only) ─── */

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

/* ─── View State ─── */

export type ViewMode = "chat" | "diary";
