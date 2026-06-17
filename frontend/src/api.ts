import type {
  ChatResponse,
  DateGroup,
  Entry,
  RecentDay,
  SearchResult,
} from "./types";

const API_BASE = "/api";

/* ─── Chat ─── */

export async function sendMessage(message: string): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function sendMessageStream(
  message: string,
  onChunk: (chunk: string) => void,
  onDone: (response: string, entryId: number) => void,
  onError: (error: string) => void,
): Promise<void> {
  const res = await fetch(`${API_BASE}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    onError(err.detail || `HTTP ${res.status}`);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    onError("No response stream available");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;

      const jsonStr = trimmed.slice(6);
      try {
        const data = JSON.parse(jsonStr);
        if (data.error) {
          onError(data.error);
          return;
        }
        if (data.chunk) {
          onChunk(data.chunk);
        }
        if (data.done) {
          onDone(data.response, data.entry_id);
          return;
        }
      } catch {
        // Skip malformed JSON lines
      }
    }
  }
}

/* ─── Entries ─── */

export async function fetchAllEntries(): Promise<DateGroup[]> {
  const res = await fetch(`${API_BASE}/entries`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.groups;
}

export async function fetchEntriesByDate(date: string): Promise<Entry[]> {
  const res = await fetch(`${API_BASE}/entries/${date}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.entries;
}

export async function fetchRecentDays(
  limit: number = 30,
): Promise<RecentDay[]> {
  const res = await fetch(`${API_BASE}/entries/recent-days?limit=${limit}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.days;
}

/* ─── Search ─── */

export async function semanticSearch(query: string): Promise<SearchResult[]> {
  const res = await fetch(
    `${API_BASE}/search?q=${encodeURIComponent(query)}`,
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.results;
}
