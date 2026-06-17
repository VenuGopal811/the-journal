import { useCallback, useEffect, useState } from "react";
import type { DateGroup, SearchResult } from "../types";
import { fetchAllEntries, semanticSearch } from "../api";
import EntryViewer from "../components/EntryViewer";

interface DiaryProps {
  selectedDate: string | null;
  refreshKey: number;
}

export default function Diary({ selectedDate, refreshKey }: DiaryProps) {
  const [groups, setGroups] = useState<DateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(
    null,
  );
  const [searching, setSearching] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllEntries();
      setGroups(data);

      // Auto-expand the selected date, or the first date
      if (selectedDate) {
        setExpandedDates(new Set([selectedDate]));
      } else if (data.length > 0) {
        setExpandedDates(new Set([data[0].date]));
      }
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries, refreshKey]);

  // Scroll to selected date
  useEffect(() => {
    if (selectedDate) {
      setExpandedDates((prev) => new Set([...prev, selectedDate]));
      const el = document.getElementById(`diary-date-${selectedDate}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedDate]);

  const toggleDate = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const results = await semanticSearch(q);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
    if (e.key === "Escape") {
      setSearchQuery("");
      setSearchResults(null);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 sm:px-8 py-5">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-semibold text-text-primary mb-4">
            Diary
          </h1>

          {/* Search Bar */}
          <div className="relative">
            <div className="flex items-center gap-2 bg-surface-2 rounded-xl border border-border px-3.5 py-2.5 focus-within:glow-ring transition-shadow duration-200">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-text-muted flex-shrink-0"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value.trim()) setSearchResults(null);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search your memories..."
                className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
                id="diary-search"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="text-text-muted hover:text-text-primary transition-colors"
                  aria-label="Clear search"
                  id="diary-search-clear"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              )}
              {searching && (
                <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6">
        <div className="max-w-2xl mx-auto">
          {/* Search Results */}
          {searchResults !== null && (
            <div className="mb-8 fade-in">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-text-muted">
                  {searchResults.length} result
                  {searchResults.length !== 1 ? "s" : ""} for "
                  <span className="text-accent">{searchQuery}</span>"
                </p>
                <button
                  onClick={clearSearch}
                  className="text-xs text-text-muted hover:text-accent transition-colors"
                  id="diary-search-back"
                >
                  ← Back to all entries
                </button>
              </div>

              {searchResults.length === 0 && (
                <p className="text-text-muted text-sm py-8 text-center">
                  No matching memories found.
                </p>
              )}

              <div className="space-y-3">
                {searchResults.map((result, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-surface-2 border border-border-subtle hover:border-border transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                        {result.role === "user" ? "You" : "Journal"}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {result.date}
                      </span>
                      <span className="ml-auto text-[10px] text-accent/60">
                        {Math.round(result.relevance * 100)}% match
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed line-clamp-3">
                      {result.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Entry List */}
          {searchResults === null && (
            <>
              {loading && (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                </div>
              )}

              {!loading && groups.length === 0 && (
                <div className="text-center py-16 fade-in">
                  <p className="text-text-muted text-sm">
                    No entries yet. Start chatting to create your first entry!
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {groups.map((group) => (
                  <div
                    key={group.date}
                    id={`diary-date-${group.date}`}
                    className="rounded-xl border border-border-subtle overflow-hidden transition-colors hover:border-border"
                  >
                    {/* Date Header (collapsible) */}
                    <button
                      onClick={() => toggleDate(group.date)}
                      className="w-full flex items-center justify-between px-5 py-3.5 bg-surface-2/50 hover:bg-surface-2 transition-colors"
                      id={`diary-toggle-${group.date}`}
                    >
                      <div className="flex items-center gap-3">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={`text-text-muted transition-transform duration-200 ${
                            expandedDates.has(group.date) ? "rotate-90" : ""
                          }`}
                        >
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                        <span className="text-sm font-medium text-text-primary">
                          {new Date(group.date + "T00:00:00").toLocaleDateString(
                            "en-US",
                            {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-text-muted bg-surface-3 px-2 py-0.5 rounded-full">
                        {group.entry_count}
                      </span>
                    </button>

                    {/* Entries */}
                    {expandedDates.has(group.date) && (
                      <div className="px-5 py-4 border-t border-border-subtle">
                        <EntryViewer
                          date={group.date}
                          entries={group.entries}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
