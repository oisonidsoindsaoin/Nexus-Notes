"use client";

import { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { playClick, playAiComplete } from "@/lib/sounds";
import { formatDistanceToNow } from "date-fns";

const QUICK_ACTIONS = [
  { icon: "✨", label: "Improve Writing", prompt: "Improve the writing of this note. Make it clearer and better structured." },
  { icon: "📝", label: "Summarize", prompt: "Summarize this note in a few key points." },
  { icon: "📌", label: "Bullet Points", prompt: "Convert this note into organized bullet points." },
  { icon: "🎓", label: "Study Guide", prompt: "Create a study guide from this note." },
  { icon: "🧠", label: "Explain", prompt: "Explain the content of this note simply." },
  { icon: "🔄", label: "Rewrite", prompt: "Rewrite this note with better clarity." },
  { icon: "💡", label: "Brainstorm", prompt: "Brainstorm ideas related to this note." },
  { icon: "✅", label: "Checklist", prompt: "Create a checklist from this note." },
  { icon: "📚", label: "Flashcards", prompt: "Create Q&A flashcards from this note." },
];

export function AiPanel() {
  const {
    userEmail, aiConversations, currentConversationId, setCurrentConversationId,
    aiMessages, setAiMessages, addAiMessage, aiStreaming, setAiStreaming,
    addAiConversation, removeAiConversation,
    setAiPanelOpen, currentNoteId, notes, aiNoteContext,
    soundEnabled, masterVolume, addToast,
  } = useAppStore();

  const [input, setInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [aiConnected, setAiConnected] = useState<boolean | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const vol = masterVolume / 100;
  const headers: Record<string, string> = { "x-user-email": userEmail || "", "Content-Type": "application/json" };

  const currentNote = notes.find((n) => n.id === currentNoteId);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [aiMessages]);

  useEffect(() => {
    if (currentConversationId) loadMessages(currentConversationId);
    else setAiMessages([]);
  }, [currentConversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadMessages(convoId: string) {
    try { const res = await fetch(`/api/ai/conversations/${convoId}`); if (res.ok) setAiMessages(await res.json()); } catch { /* */ }
  }

  async function sendMessage(text?: string) {
    const msg = text || input.trim();
    if (!msg || aiStreaming) return;
    if (soundEnabled) playClick(vol);
    setInput("");

    addAiMessage({ id: `temp-${Date.now()}`, conversationId: currentConversationId || "new", role: "user", content: msg, createdAt: new Date().toISOString() });
    setAiStreaming(true);

    try {
      const body: Record<string, unknown> = { message: msg, conversationId: currentConversationId };
      if (aiNoteContext && currentNote) body.noteContext = `Title: ${currentNote.title}\n\n${currentNote.content}`;

      const res = await fetch("/api/ai/chat", { method: "POST", headers, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json(); addToast({ message: err.error || "AI request failed", type: "error" }); setAiStreaming(false); return; }

      const data = await res.json();
      if (!currentConversationId && data.conversationId) {
        setCurrentConversationId(data.conversationId);
        addAiConversation({ id: data.conversationId, title: msg.substring(0, 60), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      }
      addAiMessage(data.message);
      if (soundEnabled) playAiComplete(vol);
    } catch { addToast({ message: "Something went wrong. Try again.", type: "error" }); }
    setAiStreaming(false);
  }

  function handleQuickAction(prompt: string) {
    if (!currentNote && aiNoteContext) { addToast({ message: "Open a note first to use this action", type: "warning" }); return; }
    sendMessage(prompt);
  }

  async function newConversation() { if (soundEnabled) playClick(vol); setCurrentConversationId(null); setAiMessages([]); }

  async function deleteConversation(id: string) {
    if (soundEnabled) playClick(vol);
    try { await fetch(`/api/ai/conversations/${id}`, { method: "DELETE" }); removeAiConversation(id); if (currentConversationId === id) { setCurrentConversationId(null); setAiMessages([]); } addToast({ message: "Conversation deleted", type: "success" }); }
    catch { addToast({ message: "Couldn't delete", type: "error" }); }
  }

  async function testConnection() {
    setTestingConnection(true);
    try { const res = await fetch("/api/ai/test"); const data = await res.json(); setAiConnected(data.connected); addToast({ message: data.connected ? "✓ AI Connected!" : data.message, type: data.connected ? "success" : "error" }); }
    catch { setAiConnected(false); addToast({ message: "Connection failed", type: "error" }); }
    setTestingConnection(false);
  }

  function copyMessage(content: string) { navigator.clipboard.writeText(content); addToast({ message: "Copied!", type: "success" }); }

  function handleKeyDown(e: React.KeyboardEvent) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[rgb(var(--border))]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-[rgb(var(--accent))] flex items-center justify-center">
            <span className="text-white text-sm">🤖</span>
          </div>
          <div>
            <h2 className="font-bold text-sm">AI Assistant</h2>
            <p className="text-[10px] text-[rgb(var(--text-secondary))]">
              Gemini {aiConnected === true && <span className="text-green-500">● Online</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setShowHistory(!showHistory)} className="p-1.5 rounded-xl text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg))] transition-colors text-sm" title="History">📜</button>
          <button onClick={newConversation} className="p-1.5 rounded-xl text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg))] transition-colors text-sm" title="New Chat">➕</button>
          <button onClick={testConnection} disabled={testingConnection} className="p-1.5 rounded-xl text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg))] transition-colors text-sm" title="Test">{testingConnection ? "⏳" : "🔌"}</button>
          <button onClick={() => setAiPanelOpen(false)} className="p-1.5 rounded-xl text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg))] transition-colors">✕</button>
        </div>
      </div>

      {aiNoteContext && currentNote && (
        <div className="px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1.5 border-b border-[rgb(var(--border))] font-medium">
          <span>📄</span><span className="truncate">Reading: {currentNote.title}</span>
        </div>
      )}

      {showHistory && (
        <div className="border-b border-[rgb(var(--border))] max-h-64 overflow-y-auto animate-fade-in">
          <div className="p-2.5 text-[11px] font-semibold text-[rgb(var(--text-secondary))] uppercase tracking-wider px-4">Conversations</div>
          {aiConversations.length === 0 ? <div className="p-6 text-center text-xs text-[rgb(var(--text-secondary))]">No conversations yet</div> :
            aiConversations.map((c) => (
              <div key={c.id} className={`flex items-center gap-2 px-4 py-2.5 cursor-pointer transition-colors ${currentConversationId === c.id ? "bg-[rgb(var(--accent))]/10" : "hover:bg-[rgb(var(--bg))]"}`} onClick={() => { setCurrentConversationId(c.id); setShowHistory(false); }}>
                <span className="text-sm">💬</span>
                <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{c.title}</p><p className="text-[10px] text-[rgb(var(--text-secondary))]">{formatDistanceToNow(new Date(c.updatedAt), { addSuffix: true })}</p></div>
                <button onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }} className="p-1 rounded text-[rgb(var(--text-secondary))] hover:text-red-500 text-xs">✕</button>
              </div>
            ))
          }
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {aiMessages.length === 0 && !showHistory && (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-[rgb(var(--accent))]/10 dark:from-purple-900/30 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🤖</span>
            </div>
            <h3 className="font-bold text-sm mb-1">Hey there! 👋</h3>
            <p className="text-xs text-[rgb(var(--text-secondary))] mb-5 max-w-[220px] mx-auto leading-relaxed">
              I can help you write, study, brainstorm, or just chat. Try a quick action below!
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {QUICK_ACTIONS.map((a) => (
                <button key={a.label} onClick={() => handleQuickAction(a.prompt)} className="flex items-center gap-2.5 px-3 py-2.5 text-left text-xs rounded-xl border border-[rgb(var(--border))] hover:bg-[rgb(var(--bg))] hover:border-[rgb(var(--accent))]/30 transition-all font-medium">
                  <span className="text-base">{a.icon}</span><span>{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {aiMessages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user" ? "bg-gradient-to-r from-[rgb(var(--accent))] to-purple-500 text-white rounded-br-md" : "bg-[rgb(var(--bg))] border border-[rgb(var(--border))] rounded-bl-md"}`}>
              <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              {msg.role === "assistant" && (
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[rgb(var(--border))]/30">
                  <button onClick={() => copyMessage(msg.content)} className="text-[10px] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text))] px-2 py-0.5 rounded-lg hover:bg-[rgb(var(--bg))] font-medium">📋 Copy</button>
                  <button onClick={() => sendMessage("Regenerate your last response.")} className="text-[10px] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text))] px-2 py-0.5 rounded-lg hover:bg-[rgb(var(--bg))] font-medium">🔄 Retry</button>
                </div>
              )}
            </div>
          </div>
        ))}

        {aiStreaming && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-[rgb(var(--bg))] border border-[rgb(var(--border))] rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse-soft" />
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse-soft" style={{ animationDelay: "0.2s" }} />
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse-soft" style={{ animationDelay: "0.4s" }} />
                </div>
                <span className="text-xs text-[rgb(var(--text-secondary))]">Thinking...</span>
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
            value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            rows={1}
            className="flex-1 px-4 py-3 text-sm bg-[rgb(var(--bg))] border border-[rgb(var(--border))] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all max-h-32"
            style={{ minHeight: 44 }}
          />
          <button onClick={() => sendMessage()} disabled={!input.trim() || aiStreaming} className="p-3 bg-gradient-to-r from-purple-500 to-[rgb(var(--accent))] text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-30 active:scale-95 flex-shrink-0 shadow-md shadow-purple-200/50 dark:shadow-purple-900/30">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="m22 2-7 20-4-9-9-4z" /><path d="m22 2-11 11" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
