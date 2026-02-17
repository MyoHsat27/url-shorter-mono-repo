"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  sourceFacts?: Array<{ factText: string; similarity: number }>;
}

export function ChatInterface() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:3200/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
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
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all z-50"
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
        className="flex items-center justify-between p-4 bg-blue-600 text-white cursor-pointer"
        onClick={() => !isMinimized && setIsMinimized(true)}
      >
        <div className="flex items-center gap-2">
          <MessageCircle size={20} />
          <span className="font-semibold">Analytics AI</span>
        </div>
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-blue-700 rounded"
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-blue-700 rounded"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-zinc-500 mt-8">
                <p>Hi! I can help you analyze your link performance.</p>
                <p className="text-sm mt-2">
                  Try asking: "How many clicks did I get today?"
                </p>
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
                    "p-3 rounded-2xl text-sm",
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-none",
                  )}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>

                {msg.sourceFacts && msg.sourceFacts.length > 0 && (
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 px-2">
                    <details>
                      <summary className="cursor-pointer hover:underline">
                        View Sources
                      </summary>
                      <div className="mt-1 space-y-1 bg-zinc-50 dark:bg-zinc-900 p-2 rounded border border-zinc-200 dark:border-zinc-800">
                        {msg.sourceFacts.map((fact, i) => (
                          <div
                            key={i}
                            className="border-b border-zinc-200 dark:border-zinc-800 last:border-0 pb-1 last:pb-0"
                          >
                            {fact.factText}
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-2xl rounded-bl-none">
                  <span className="animate-pulse">...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your analytics..."
                className="flex-1 px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent text-zinc-900 dark:text-zinc-100"
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
