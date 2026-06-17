import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../types";
import { sendMessageStream } from "../api";

interface ChatProps {
  onNewMessage: () => void;
}

export default function Chat({ onNewMessage }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    const assistantMsg: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsLoading(true);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    try {
      await sendMessageStream(
        text,
        // onChunk
        (chunk) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content: last.content + chunk,
              };
            }
            return updated;
          });
        },
        // onDone
        () => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                isStreaming: false,
              };
            }
            return updated;
          });
          setIsLoading(false);
          onNewMessage();
        },
        // onError
        (error) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content: `⚠ ${error}`,
                isStreaming: false,
              };
            }
            return updated;
          });
          setIsLoading(false);
        },
      );
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant") {
          updated[updated.length - 1] = {
            ...last,
            content: `⚠ Connection failed. Is the backend running?`,
            isStreaming: false,
          };
        }
        return updated;
      });
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center fade-in">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent-dim/20 flex items-center justify-center mb-6">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-accent"
              >
                <path d="M12 20h9" />
                <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              What's on your mind?
            </h2>
            <p className="text-text-muted text-sm max-w-sm leading-relaxed">
              Talk to me like a friend. I'll listen, reflect, and remember —
              everything stays between us.
            </p>
          </div>
        )}

        <div className="max-w-2xl mx-auto space-y-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex slide-up ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] ${
                  msg.role === "user" ? "order-1" : "order-1"
                }`}
              >
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-user-bubble text-text-primary rounded-br-md"
                      : "bg-ai-bubble text-text-primary rounded-bl-md border border-border-subtle"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">
                    {msg.content}
                    {msg.isStreaming && !msg.content && (
                      <span className="inline-flex gap-1 ml-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent typing-dot" />
                        <span className="w-1.5 h-1.5 rounded-full bg-accent typing-dot" />
                        <span className="w-1.5 h-1.5 rounded-full bg-accent typing-dot" />
                      </span>
                    )}
                    {msg.isStreaming && msg.content && (
                      <span className="inline-block w-0.5 h-4 bg-accent ml-0.5 animate-pulse align-text-bottom" />
                    )}
                  </div>
                </div>
                <p
                  className={`text-[10px] text-text-muted mt-1 px-1 ${
                    msg.role === "user" ? "text-right" : "text-left"
                  }`}
                >
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border p-4 sm:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-3 bg-surface-2 rounded-2xl border border-border px-4 py-3 focus-within:glow-ring transition-shadow duration-200">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Write something..."
              rows={1}
              disabled={isLoading}
              className="flex-1 bg-transparent text-text-primary text-sm placeholder:text-text-muted resize-none outline-none max-h-40 leading-relaxed"
              id="chat-input"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={`p-2 rounded-xl transition-all duration-200 flex-shrink-0 ${
                input.trim() && !isLoading
                  ? "bg-accent text-white hover:bg-accent-dim shadow-lg shadow-accent/20"
                  : "bg-surface-3 text-text-muted cursor-not-allowed"
              }`}
              aria-label="Send message"
              id="chat-send"
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
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          </div>
          <p className="text-[10px] text-text-muted text-center mt-2">
            Shift + Enter for a new line
          </p>
        </div>
      </div>
    </div>
  );
}
