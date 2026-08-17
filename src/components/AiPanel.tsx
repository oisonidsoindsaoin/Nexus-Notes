"use client";

import { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { playClick, playAiComplete } from "@/lib/sounds";
import { formatDistanceToNow } from "date-fns";

const QUICK_ACTIONS = [
  { icon: "✨", label: "Improve Writing", prompt: "Improve the writing of this note. Make it clearer, more concise, and better structured." },
  { icon: "📝", label: "Summarize", prompt: "Summarize this note in a few key points." },
  { icon: "📌", label: "Bullet Points", prompt: "Convert this note into organized bullet points." },
  { icon: "🎓", label: "Study Guide", prompt: "Create a study guide from this note with key concepts, definitions, and review questions." },
  { icon: "🧠", label: "Explain", prompt: "Explain the content of this note in simple terms." },
  { icon: "🔄", label: "Rewrite", prompt: "Rewrite this note with better clarity and organization." },
  { icon: "💡", label: "Brainstorm", prompt: "Brainstorm related ideas and expand on the topics in this note." },
  { icon: "✅", label: "Create Checklist", prompt: "Convert the main action items or tasks from this note into a checklist." },
  { icon: "📚", label: "Create Flashcards", prompt: "Create flashcards (Q&A format) from the key concepts in this note." },
];

export function AiPanel() {
  const {
    aiConversations, currentConversationId, setCurrentConversationId,
    aiMessages, setAiMessages, addAiMessage, aiStreaming, setAiStreaming,
    addAiConversation, removeAiConversation, setAiConversations,
    setAiPanelOpen, currentNoteId, notes, aiNoteContext,
    soundEnabled, masterVolume, addToast,
  } = useAppStore();

  const [input, setInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [aiConnected, setAiConnected] = useState<boolean | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const vol = masterVolume / 100;

  const currentNote = notes.find((n) => n.id === currentNoteId);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  // Load conversation messages when switching conversations
  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId);
    } else {
      setAiMessages([]);
    }
  }, [currentConversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadMessages(convoId: string) {
    try {
      const res = await fetch(`/api/ai/conversations/${convoId}`);
      if (res.ok) setAiMessages(await res.json());
    } catch { /* ignore */ }
  }

  async function sendMessage(text?: string) {
    const msg = text || input.trim();
    if (!msg || aiStreaming) return;

    if (soundEnabled) playClick(vol);
    setInput("");

    // Optimistic user message
    const userMsg = {
      id: `temp-${Date.now()}`,
      conversationId: currentConversationId || "new",
      role: "user" as const,
      content: msg,
      createdAt: new Date().toISOString(),
    };
    addAiMessage(userMsg);

    setAiStreaming(true);

    try {
      const body: Record<string, unknown> = {
        message: msg,
        conversationId: currentConversationId,
      };

      if (aiNoteContext && currentNote) {
        body.noteContext = `Title: ${currentNote.title}\n\n${currentNote.content}`;
      }

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        addToast({ message: err.error || "AI request failed", type: "error" });
        setAiStreaming(false);
        return;
      }

      const data = await res.json();

      // Set conversation ID if new
      if (!currentConversationId && data.conversationId) {
        setCurrentConversationId(data.conversationId);
        addAiConversation({
          id: data.conversationId,
          title: msg.substring(0, 60),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      addAiMessage(data.message);
      if (soundEnabled) playAiComplete(vol);
    } catch {
      addToast({ message: "Something went wrong. Please try again.", type: "error" });
    }

    setAiStreaming(false);
  }

  function handleQuickAction(prompt: string) {
    if (!currentNote && aiNoteContext) {
      addToast({ message: "Open a note first, or disable note context", type: "warning" });
      return;
    }
    sendMessage(prompt);
  }

  async function newConversation() {
    if (soundEnabled) playClick(vol);
    setCurrentConversationId(null);
    setAiMessages([]);
  }

  async function deleteConversation(id: string) {
    if (soundEnabled) playClick(vol);
    try {
      await fetch(`/api/ai/conversations/${id}`, { method: "DELETE" });
      removeAiConversation(id);
      if (currentConversationId === id) {
        setCurrentConversationId(null);
        setAiMessages([]);
      }
      addToast({ message: "Conversation deleted", type: "success" });
    } catch {
      addToast({ message: "Failed to delete conversation", type: "error" });
    }
  }

  async function testConnection() {
    setTestingConnection(true);
    try {
      const res = await fetch("/api/ai/test");
      const data = await res.json();
      setAiConnected(data.connected);
      addToast({
        message: data.connected ? "✓ Gemini Connected" : "✕ " + data.message,
        type: data.connected ? "success" : "error",
      });
    } catch {
      setAiConnected(false);
      addToast({ message: "Connection test failed", type: "error" });
    }
    setTestingConnection(false);
  }

  function copyMessage(content: string) {
    navigator.clipboard.writeText(content);
    addToast({ message: "Copied to clipboard", type: "success" });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[rgb(var(--border))]">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <div>
            <h2 className="font-semibold text-sm">AI Assistant</h2>
            <p className="text-[10px] text-[rgb(var(--text-secondary))]">
              Powered by Gemini
              {aiConnected === true && <span className="text-green-500 ml-1">● Connected</span>}
              {aiConnected === false && <span className="text-red-500 ml-1">● Disconnected</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-1.5 rounded-lg text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg))] transition-colors text-xs"
            title="History"
          >
            📜
          </button>
          <button
            onClick={newConversation}
            className="p-1.5 rounded-lg text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg))] transition-colors text-xs"
            title="New Chat"
          >
            ➕
          </button>
          <button
            onClick={testConnection}
            disabled={testingConnection}
            className="p-1.5 rounded-lg text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg))] transition-colors text-xs"
            title="Test Connection"
          >
            {testingConnection ? "⏳" : "🔌"}
          </button>
          <button
            onClick={() => setAiPanelOpen(false)}
            className="p-1.5 rounded-lg text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg))] transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Context indicator */}
      {aiNoteContext && currentNote && (
        <div className="px-3 py-2 bg-purple-50 dark:bg-purple-900/20 text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1.5 border-b border-[rgb(var(--border))]">
          <span>📄</span>
          <span className="truncate">Using: {currentNote.title}</span>
        </div>
      )}

      {/* History Panel */}
      {showHistory && (
        <div className="border-b border-[rgb(var(--border))] max-h-64 overflow-y-auto animate-fade-in">
          <div className="p-2 text-xs font-medium text-[rgb(var(--text-secondary))] uppercase tracking-wider px-3">
            Conversations
          </div>
          {aiConversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-[rgb(var(--text-secondary))]">No conversations yet</div>
          ) : (
            aiConversations.map((c) => (
              <div
                key={c.id}
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                  currentConversationId === c.id ? "bg-[rgb(var(--accent))]/10" : "hover:bg-[rgb(var(--bg))]"
                }`}
                onClick={() => {
                  setCurrentConversationId(c.id);
                  setShowHistory(false);
                }}
              >
                <span className="text-xs">💬</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{c.title}</p>
                  <p className="text-[10px] text-[rgb(var(--text-secondary))]">
                    {formatDistanceToNow(new Date(c.updatedAt), { addSuffix: true })}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                  className="p-1 rounded text-[rgb(var(--text-secondary))] hover:text-red-500 opacity-0 group-hover:opacity-100"
                >
                  <span className="text-xs">✕</span>
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {aiMessages.length === 0 && !showHistory && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🤖</div>
            <h3 className="font-semibold text-sm mb-1">AI Assistant</h3>
            <p className="text-xs text-[rgb(var(--text-secondary))] mb-4 max-w-[200px] mx-auto">
              Ask me anything, or use quick actions below to work with your notes.
            </p>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 gap-1.5">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(action.prompt)}
                  className="flex items-center gap-2 px-3 py-2 text-left text-xs rounded-lg border border-[rgb(var(--border))] hover:bg-[rgb(var(--bg))] hover:border-[rgb(var(--accent))]/30 transition-all"
                >
                  <span>{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {aiMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-[rgb(var(--accent))] text-white rounded-br-md"
                  : "bg-[rgb(var(--bg))] border border-[rgb(var(--border))] rounded-bl-md"
              }`}
            >
              <div className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</div>
              {msg.role === "assistant" && (
                <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-[rgb(var(--border))]/50">
                  <button
                    onClick={() => copyMessage(msg.content)}
                    className="text-[10px] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text))] px-1.5 py-0.5 rounded hover:bg-[rgb(var(--bg))]"
                  >
                    📋 Copy
                  </button>
                  <button
                    onClick={() => sendMessage("Please regenerate your last response.")}
                    className="text-[10px] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text))] px-1.5 py-0.5 rounded hover:bg-[rgb(var(--bg))]"
                  >
                    🔄 Retry
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {aiStreaming && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-[rgb(var(--bg))] border border-[rgb(var(--border))] rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse-soft" />
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse-soft" style={{ animationDelay: "0.2s" }} />
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse-soft" style={{ animationDelay: "0.4s" }} />
                <span className="text-xs text-[rgb(var(--text-secondary))] ml-1">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[rgb(var(--border))] p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            rows={1}
            className="flex-1 px-3 py-2.5 text-sm bg-[rgb(var(--bg))] border border-[rgb(var(--border))] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all max-h-32"
            style={{ minHeight: 40 }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || aiStreaming}
            className="p-2.5 bg-gradient-to-r from-purple-500 to-[rgb(var(--accent))] text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 flex-shrink-0"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24">
              <path d="m22 2-7 20-4-9-9-4z" /><path d="m22 2-11 11" />
            </svg>
          </button>
        </div>

        {/* Quick action pills */}
        {aiMessages.length > 0 && (
          <div className="flex gap-1 mt-2 overflow-x-auto pb-1">
            {QUICK_ACTIONS.slice(0, 4).map((a) => (
              <button
                key={a.label}
                onClick={() => handleQuickAction(a.prompt)}
                className="flex-shrink-0 text-[10px] px-2 py-1 rounded-full border border-[rgb(var(--border))] text-[rgb(var(--text-secondary))] hover:border-purple-300 hover:text-purple-500 transition-colors"
              >
                {a.icon} {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
