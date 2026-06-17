import type { Entry } from "../types";

interface EntryViewerProps {
  date: string;
  entries: Entry[];
}

export default function EntryViewer({ date, entries }: EntryViewerProps) {
  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="slide-up">
      <h3 className="text-lg font-semibold text-text-primary mb-1">
        {formatDate(date)}
      </h3>
      <p className="text-xs text-text-muted mb-5">
        {entries.length} {entries.length === 1 ? "entry" : "entries"}
      </p>

      <div className="space-y-3">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={`group relative pl-4 border-l-2 transition-colors duration-200 ${
              entry.role === "user"
                ? "border-accent/30 hover:border-accent/60"
                : "border-surface-4 hover:border-text-muted"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider ${
                  entry.role === "user" ? "text-accent" : "text-text-muted"
                }`}
              >
                {entry.role === "user" ? "You" : "Journal"}
              </span>
              <span className="text-[10px] text-text-muted">
                {formatTime(entry.timestamp)}
              </span>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
              {entry.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
