"use client";

import { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { playClick } from "@/lib/sounds";

interface CommandItem {
  id: string;
  label: string;
  icon: string;
  shortcut?: string;
  action: () => void;
}

export function CommandPalette() {
  const {
    setCommandPaletteOpen, setSidebarView, setAiPanelOpen,
    setSettingsOpen, setSidebarOpen, setMobileView,
    theme, setTheme, soundEnabled, masterVolume, addNote,
    setCurrentNoteId, addToast, setSaveStatus,
  } = useAppStore();

  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const vol = masterVolume / 100;

  const commands: CommandItem[] = [
    {
      id: "new-note",
      label: "New Note",
      icon: "📝",
      shortcut: "⌘N",
      action: async () => {
        try {
          setSaveStatus("saving");
          const res = await fetch("/api/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Untitled" }),
          });
          if (res.ok) {
            const note = await res.json();
            addNote(note);
            setCurrentNoteId(note.id);
            setSaveStatus("saved");
            addToast({ message: "Note created", type: "success" });
          }
        } catch {
          setSaveStatus("error");
        }
        close();
      },
    },
    { id: "search", label: "Search Notes", icon: "🔍", shortcut: "⌘K", action: () => { setSidebarView("notes"); setSidebarOpen(true); close(); } },
    { id: "ai", label: "Open AI Assistant", icon: "🤖", shortcut: "⌘\\", action: () => { setAiPanelOpen(true); close(); } },
    { id: "favorites", label: "Favorites", icon: "⭐", action: () => { setSidebarView("favorites"); setSidebarOpen(true); close(); } },
    { id: "pinned", label: "Pinned Notes", icon: "📌", action: () => { setSidebarView("pinned"); setSidebarOpen(true); close(); } },
    { id: "trash", label: "Trash", icon: "🗑️", action: () => { setSidebarView("trash"); setSidebarOpen(true); close(); } },
    { id: "settings", label: "Settings", icon: "⚙️", shortcut: "⌘,", action: () => { setSettingsOpen(true); close(); } },
    { id: "toggle-theme", label: `Toggle Theme (${theme})`, icon: theme === "dark" ? "☀️" : "🌙", action: () => { setTheme(theme === "dark" ? "light" : "dark"); close(); } },
    { id: "toggle-sidebar", label: "Toggle Sidebar", icon: "📋", shortcut: "⌘B", action: () => { setSidebarOpen(true); setMobileView("sidebar"); close(); } },
    { id: "templates", label: "Templates", icon: "📋", action: () => { setSidebarView("templates"); setSidebarOpen(true); close(); } },
  ];

  const filtered = query
    ? commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
    : commands;

  function close() {
    setCommandPaletteOpen(false);
  }

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-start justify-center pt-[20vh]" onClick={close}>
      <div
        className="bg-[rgb(var(--card-bg))] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in border border-[rgb(var(--border))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-4 border-b border-[rgb(var(--border))]">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-[rgb(var(--text-secondary))]">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command..."
            className="flex-1 bg-transparent focus:outline-none text-sm"
          />
          <kbd className="px-2 py-0.5 text-xs bg-[rgb(var(--bg))] border border-[rgb(var(--border))] rounded">ESC</kbd>
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {filtered.map((cmd) => (
            <button
              key={cmd.id}
              onClick={() => { if (soundEnabled) playClick(vol); cmd.action(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-[rgb(var(--bg))] transition-colors text-left"
            >
              <span className="text-base">{cmd.icon}</span>
              <span className="flex-1 text-sm">{cmd.label}</span>
              {cmd.shortcut && (
                <kbd className="px-2 py-0.5 text-[10px] bg-[rgb(var(--bg))] border border-[rgb(var(--border))] rounded font-mono">
                  {cmd.shortcut}
                </kbd>
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-[rgb(var(--text-secondary))]">
              No commands found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
