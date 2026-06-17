import { useState, useCallback } from "react";
import type { ViewMode } from "./types";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import Diary from "./pages/Diary";

export default function App() {
  const [activeView, setActiveView] = useState<ViewMode>("chat");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleNewMessage = useCallback(() => {
    // Bump the refresh key to tell sidebar + diary to refetch
    setRefreshKey((k) => k + 1);
  }, []);

  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  return (
    <div className="flex h-full w-full overflow-hidden bg-surface-0">
      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        refreshKey={refreshKey}
      />

      {/* Main Content */}
      <main className="flex-1 min-w-0 bg-surface-0">
        {activeView === "chat" ? (
          <Home onNewMessage={handleNewMessage} />
        ) : (
          <Diary selectedDate={selectedDate} refreshKey={refreshKey} />
        )}
      </main>
    </div>
  );
}
