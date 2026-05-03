"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle,
  X,
  Send,
  Maximize2,
  Minimize2,
  Trash2,
  Globe,
  User,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

interface Message {
  role: "user" | "assistant";
  content: string;
  sourceFacts?: Array<{
    factText: string;
    factType: string;
    similarity?: number;
  }>;
}

type ChatTab = "global" | "user";

const GLOBAL_SUGGESTIONS = [
  "What are the trending links?",
  "Show me traffic patterns",
  "Which countries use the service most?",
  "Give me a summary of recent activity",
];

const USER_SUGGESTIONS = [
  "How are my links performing?",
  "Which of my links gets the most clicks?",
  "Show me my link traffic patterns",
  "What countries visit my links?",
];

const ANALYTICS_API_URL =
  process.env.NEXT_PUBLIC_ANALYTICS_API_URL || "http://localhost:3200";

export function ChatInterface() {
  const { isAuthenticated, getAuthHeaders } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<ChatTab>("global");
  const [globalMessages, setGlobalMessages] = useState<Message[]>([]);
  const [userMessages, setUserMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [globalSessionId] = useState(
    () => `global-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const [userSessionId] = useState(
    () => `user-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  const messages = activeTab === "global" ? globalMessages : userMessages;
  const setMessages =
    activeTab === "global" ? setGlobalMessages : setUserMessages;
  const sessionId = activeTab === "global" ? globalSessionId : userSessionId;
  const suggestions =
    activeTab === "global" ? GLOBAL_SUGGESTIONS : USER_SUGGESTIONS;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [globalMessages, userMessages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isStreaming) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

    try {
      const streamUrl =
        activeTab === "user"
          ? `${ANALYTICS_API_URL}/chat/user/stream`
          : `${ANALYTICS_API_URL}/chat/stream`;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (activeTab === "user") {
        Object.assign(headers, getAuthHeaders());
      }

      const response = await fetch(streamUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: text, sessionId }),
      });

      if (!response.ok) throw new Error("Stream failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let assistantContent = "";
      const sourceFacts: Message["sourceFacts"] = [];

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", sourceFacts: [] },
      ]);

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6)) as {
              type: string;
              data:
                | string
                | Array<{
                    factText: string;
                    factType: string;
                    similarity?: number;
                  }>;
            };
            if (parsed.type === "chunk" && typeof parsed.data === "string") {
              assistantContent += parsed.data;
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: assistantContent,
                  };
                }
                return updated;
              });
            } else if (parsed.type === "facts" && Array.isArray(parsed.data)) {
              sourceFacts.push(
                ...(
                  parsed.data as Array<{
                    factText: string;
                    factType: string;
                    similarity?: number;
                  }>
                ).slice(0, 3),
              );
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    sourceFacts: [...sourceFacts],
                  };
                }
                return updated;
              });
            }
          } catch {
            // skip malformed SSE
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev.filter((m) => m.role !== "assistant" || m.content !== ""),
        {
          role: "assistant",
          content: "Sorry, I couldn't connect to the analytics service.",
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const handleTabChange = (tab: ChatTab) => {
    if (tab === "user" && !isAuthenticated) return;
    setActiveTab(tab);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-6 bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg transition-all hover:scale-105 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
        aria-label="Open chat"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-2xl dark:border-neutral-800/60 dark:bg-neutral-900",
        isExpanded
          ? "inset-4 sm:inset-8"
          : "right-4 bottom-4 h-[32rem] w-[22rem] sm:right-6 sm:bottom-6 sm:h-[36rem] sm:w-96",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200/60 bg-neutral-50 px-4 py-3 dark:border-neutral-800/60 dark:bg-neutral-800/50">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-neutral-500" />
          <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Analytics Chat
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearChat}
            className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-300"
            title="Clear chat"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-300"
          >
            {isExpanded ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-300"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200/60 dark:border-neutral-800/60">
        <button
          onClick={() => handleTabChange("global")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors",
            activeTab === "global"
              ? "border-b-2 border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100"
              : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300",
          )}
        >
          <Globe className="h-3.5 w-3.5" />
          Global
        </button>
        <button
          onClick={() => handleTabChange("user")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors",
            activeTab === "user"
              ? "border-b-2 border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100"
              : !isAuthenticated
                ? "cursor-not-allowed text-neutral-300 dark:text-neutral-600"
                : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300",
          )}
          disabled={!isAuthenticated}
        >
          {isAuthenticated ? (
            <User className="h-3.5 w-3.5" />
          ) : (
            <Lock className="h-3.5 w-3.5" />
          )}
          My Links
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {!isAuthenticated &&
          activeTab === "global" &&
          messages.length === 0 && (
            <div className="mb-4 rounded-xl bg-blue-50 p-3 text-xs text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
              Sign in to access personalized analytics in the &quot;My
              Links&quot; tab.
            </div>
          )}

        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-center text-xs text-neutral-400 dark:text-neutral-500">
              {activeTab === "global"
                ? "Ask about global link analytics"
                : "Ask about your personal link analytics"}
            </p>
            <div className="grid gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => void handleSend(suggestion)}
                  className="rounded-xl border border-neutral-200/60 px-3 py-2 text-left text-xs text-neutral-600 transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800/60 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:bg-neutral-800/50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "mb-3",
                  msg.role === "user" ? "flex justify-end" : "flex",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                    msg.role === "user"
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                      : "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
                  )}
                >
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {msg.content || (
                      <span className="inline-flex items-center gap-1 text-neutral-400">
                        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                        <span
                          className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current"
                          style={{ animationDelay: "0.2s" }}
                        />
                        <span
                          className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current"
                          style={{ animationDelay: "0.4s" }}
                        />
                      </span>
                    )}
                  </div>

                  {msg.sourceFacts && msg.sourceFacts.length > 0 && (
                    <div className="mt-2 border-t border-neutral-200/50 pt-2 dark:border-neutral-700/50">
                      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                        Sources
                      </p>
                      {msg.sourceFacts.map((fact, fi) => (
                        <div
                          key={fi}
                          className="mb-1 rounded-md bg-white/50 px-2 py-1 text-[11px] text-neutral-500 dark:bg-neutral-900/50 dark:text-neutral-400"
                        >
                          <span className="mr-1 rounded bg-neutral-200 px-1 py-0.5 text-[9px] font-medium uppercase dark:bg-neutral-700">
                            {fact.factType}
                          </span>
                          {fact.factText}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-neutral-200/60 p-3 dark:border-neutral-800/60">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder={
              activeTab === "user" && !isAuthenticated
                ? "Sign in to chat about your links..."
                : "Ask about analytics..."
            }
            disabled={isStreaming || (activeTab === "user" && !isAuthenticated)}
            className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm outline-none transition-all placeholder:text-neutral-400 focus:border-neutral-300 focus:ring-2 focus:ring-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:placeholder:text-neutral-500 dark:focus:border-neutral-600 dark:focus:ring-neutral-800"
          />
          <button
            onClick={() => void handleSend()}
            disabled={
              !input.trim() ||
              isStreaming ||
              (activeTab === "user" && !isAuthenticated)
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white transition-all hover:bg-neutral-800 disabled:opacity-30 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
