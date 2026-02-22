"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle,
  X,
  Send,
  Maximize2,
  Minimize2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  sourceFacts?: Array<{
    factText: string;
    factType: string;
    similarity?: number;
  }>;
}

const SUGGESTIONS = [
  "What are the trending links?",
  "Show me traffic patterns",
  "Where is my traffic coming from?",
  "Give me a weekly summary",
];

const ANALYTICS_API =
  process.env.NEXT_PUBLIC_ANALYTICS_API_URL || "http://localhost:3200";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sessionId = sessionStorage.getItem("chat-session-id");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem("chat-session-id", sessionId);
  }
  return sessionId;
}

export function ChatInterface() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, scrollToBottom]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const handleClearChat = () => {
    setMessages([]);
    sessionStorage.removeItem("chat-session-id");
  };

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const sessionId = getSessionId();
      const response = await fetch(`${ANALYTICS_API}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No reader available");

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      let assistantMessageContent = "";
      let currentFacts: NonNullable<Message["sourceFacts"]> = [];
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "facts") {
                currentFacts = data.data;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastMessage = {
                    ...newMessages[newMessages.length - 1],
                  };
                  if (lastMessage.role === "assistant") {
                    lastMessage.sourceFacts = currentFacts;
                  }
                  newMessages[newMessages.length - 1] = lastMessage;
                  return newMessages;
                });
              } else if (data.type === "chunk") {
                assistantMessageContent += data.data;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastMessage = {
                    ...newMessages[newMessages.length - 1],
                  };
                  if (lastMessage.role === "assistant") {
                    lastMessage.content = assistantMessageContent;
                  }
                  newMessages[newMessages.length - 1] = lastMessage;
                  return newMessages;
                });
              }
            } catch (e) {
              console.error("Error parsing SSE data", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I encountered an error connecting to the analytics service. Please make sure it's running and try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(input.trim());
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all z-50 hover:scale-105"
      >
        <MessageCircle size={24} />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-lg overflow-hidden transition-all z-50 flex flex-col",
        isMinimized ? "w-72 h-14" : "w-96 h-[600px] max-h-[80vh]",
      )}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 bg-blue-600 text-white cursor-pointer shrink-0"
        onClick={() => isMinimized && setIsMinimized(false)}
      >
        <div className="flex items-center gap-2">
          <MessageCircle size={18} />
          <span className="font-semibold text-sm">Analytics AI</span>
        </div>
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {!isMinimized && messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="p-1 hover:bg-blue-700 rounded"
              title="Clear chat"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-blue-700 rounded"
          >
            {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-blue-700 rounded"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="text-center text-zinc-500 dark:text-zinc-400 mt-4">
                  <MessageCircle
                    size={32}
                    className="mx-auto mb-2 opacity-50"
                  />
                  <p className="font-medium text-sm">
                    Hi! I can help you analyze your link performance.
                  </p>
                  <p className="text-xs mt-1 text-zinc-400 dark:text-zinc-500">
                    Ask me about trending links, traffic patterns, or visitor
                    locations.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => void sendMessage(suggestion)}
                      className="text-xs px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, index) => (
              <div
                key={index}
                className={cn(
                  "flex flex-col max-w-[85%] space-y-1",
                  msg.role === "user"
                    ? "ml-auto items-end"
                    : "mr-auto items-start",
                )}
              >
                <div
                  className={cn(
                    "p-3 rounded-2xl text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-none",
                  )}
                >
                  <div className="whitespace-pre-wrap break-words">
                    {msg.content}
                  </div>
                </div>

                {msg.sourceFacts && msg.sourceFacts.length > 0 && (
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 px-2 max-w-full">
                    <details>
                      <summary className="cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                        {msg.sourceFacts.length} source
                        {msg.sourceFacts.length > 1 ? "s" : ""} used
                      </summary>
                      <div className="mt-1 space-y-1 bg-zinc-50 dark:bg-zinc-900 p-2 rounded border border-zinc-200 dark:border-zinc-800 max-h-40 overflow-y-auto">
                        {msg.sourceFacts.map((fact, i) => (
                          <div
                            key={i}
                            className="border-b border-zinc-200 dark:border-zinc-800 last:border-0 pb-1 last:pb-0"
                          >
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-200 dark:bg-zinc-700 mr-1">
                              {fact.factType}
                            </span>
                            {fact.factText}
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            ))}

            {isLoading &&
              messages[messages.length - 1]?.content === "" &&
              messages[messages.length - 1]?.role === "assistant" && (
                <div className="flex justify-start">
                  <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-2xl rounded-bl-none text-sm text-zinc-500">
                    <span className="inline-flex gap-1">
                      <span className="animate-bounce [animation-delay:0ms]">
                        .
                      </span>
                      <span className="animate-bounce [animation-delay:150ms]">
                        .
                      </span>
                      <span className="animate-bounce [animation-delay:300ms]">
                        .
                      </span>
                    </span>
                  </div>
                </div>
              )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0"
          >
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your analytics..."
                className="flex-1 px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
