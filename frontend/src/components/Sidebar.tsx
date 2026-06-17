import { useEffect, useState } from "react";
import type { RecentDay, ViewMode } from "../types";
import { fetchRecentDays } from "../api";

interface SidebarProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  refreshKey: number;
}

export default function Sidebar({
  activeView,
  onViewChange,
  selectedDate,
  onDateSelect,
  refreshKey,
}: SidebarProps) {
  const [days, setDays] = useState<RecentDay[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    fetchRecentDays(30)
      .then(setDays)
      .catch(() => setDays([]));
  }, [refreshKey]);

  const formatDateLabel = (dateStr: string): string => {
    const date = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const entryDate = new Date(dateStr + "T00:00:00");
    entryDate.setHours(0, 0, 0, 0);

    if (entryDate.getTime() === today.getTime()) return "Today";
    if (entryDate.getTime() === yesterday.getTime()) return "Yesterday";

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year:
        date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  };

  return (
    <aside
      className={`
        flex flex-col border-r border-border bg-surface-1
        transition-all duration-300 ease-out
        ${collapsed ? "w-16" : "w-64"}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2.5 fade-in">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-dim flex items-center justify-center">
              <span className="text-white font-semibold text-sm">J</span>
            </div>
            <h1 className="text-text-primary font-semibold text-base tracking-tight">
              The Journal
            </h1>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-3 transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          id="sidebar-toggle"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      {/* View Toggle */}
      {!collapsed && (
        <div className="p-3 fade-in">
          <div className="flex gap-1 p-1 bg-surface-2 rounded-lg">
            <button
              onClick={() => onViewChange("chat")}
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all duration-200 ${
                activeView === "chat"
                  ? "bg-surface-4 text-text-primary shadow-sm"
                  : "text-text-muted hover:text-text-secondary"
              }`}
              id="view-toggle-chat"
            >
              Chat
            </button>
            <button
              onClick={() => onViewChange("diary")}
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all duration-200 ${
                activeView === "diary"
                  ? "bg-surface-4 text-text-primary shadow-sm"
                  : "text-text-muted hover:text-text-secondary"
              }`}
              id="view-toggle-diary"
            >
              Diary
            </button>
          </div>
        </div>
      )}

      {/* Date Navigation */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-3 fade-in">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-2 px-2">
            Recent
          </p>
          {days.length === 0 && (
            <p className="text-text-muted text-xs px-2 py-4">
              No entries yet. Start a conversation!
            </p>
          )}
          <ul className="space-y-0.5">
            {days.map((day) => (
              <li key={day.date}>
                <button
                  onClick={() => {
                    onDateSelect(day.date);
                    onViewChange("diary");
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all duration-150 group ${
                    selectedDate === day.date
                      ? "bg-surface-3 text-text-primary"
                      : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                  }`}
                  id={`sidebar-date-${day.date}`}
                >
                  <span className="text-sm truncate">
                    {formatDateLabel(day.date)}
                  </span>
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full transition-colors ${
                      selectedDate === day.date
                        ? "bg-accent/20 text-accent"
                        : "bg-surface-3 text-text-muted group-hover:bg-surface-4 group-hover:text-text-secondary"
                    }`}
                  >
                    {day.entry_count}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer */}
      {!collapsed && (
        <div className="p-3 border-t border-border fade-in">
          <p className="text-[10px] text-text-muted text-center">
            Everything stays on your device
          </p>
        </div>
      )}
    </aside>
  );
}
