"use client";

import { useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { Sidebar } from "./Sidebar";
import { NoteEditor } from "./NoteEditor";
import { AiPanel } from "./AiPanel";
import { SettingsModal } from "./SettingsModal";
import { CommandPalette } from "./CommandPalette";
import { ToastContainer } from "./ToastContainer";

export function AppShell() {
  const {
    sidebarOpen,
    aiPanelOpen,
    settingsOpen,
    commandPaletteOpen,
    setNotes,
    setFolders,
    setAiConversations,
    theme,
    mobileView,
    setMobileView,
    setCommandPaletteOpen,
    setSettingsOpen,
    setAiPanelOpen,
    setSidebarOpen,
  } = useAppStore();

  // Load initial data
  useEffect(() => {
    async function load() {
      try {
        const [notesRes, foldersRes, convosRes] = await Promise.all([
          fetch("/api/notes"),
          fetch("/api/folders"),
          fetch("/api/ai/conversations"),
        ]);
        if (notesRes.ok) setNotes(await notesRes.json());
        if (foldersRes.ok) setFolders(await foldersRes.json());
        if (convosRes.ok) setAiConversations(await convosRes.json());
      } catch (e) {
        console.error("Failed to load data:", e);
      }
    }
    load();
  }, [setNotes, setFolders, setAiConversations]);

  // Theme handling
  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      theme === "dark" ||
      (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.classList.toggle("dark", isDark);
  }, [theme]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (isMod && e.key === ",") {
        e.preventDefault();
        setSettingsOpen(true);
      }
      if (isMod && e.key === "\\") {
        e.preventDefault();
        setAiPanelOpen(!aiPanelOpen);
      }
      if (isMod && e.key === "b") {
        e.preventDefault();
        setSidebarOpen(!sidebarOpen);
      }
      if (e.key === "Escape") {
        if (commandPaletteOpen) setCommandPaletteOpen(false);
        if (settingsOpen) setSettingsOpen(false);
      }
    },
    [commandPaletteOpen, aiPanelOpen, sidebarOpen, settingsOpen, setCommandPaletteOpen, setSettingsOpen, setAiPanelOpen, setSidebarOpen]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        setSidebarOpen(false);
        setAiPanelOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [setSidebarOpen, setAiPanelOpen]);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div className="h-screen flex flex-col bg-[rgb(var(--bg))]">
      {/* Mobile navigation bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-2 border-b border-[rgb(var(--border))] bg-[rgb(var(--sidebar-bg))]">
        <button
          onClick={() => { setMobileView("sidebar"); setSidebarOpen(true); }}
          className={`p-2 rounded-lg transition-colors ${mobileView === "sidebar" ? "bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))]" : "text-[rgb(var(--text-secondary))]"}`}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="14" height="14" rx="2"/><line x1="3" y1="9" x2="17" y2="9"/></svg>
        </button>
        <span className="font-semibold text-sm">✦ Nexus</span>
        <div className="flex gap-1">
          <button
            onClick={() => { setMobileView("editor"); setSidebarOpen(false); setAiPanelOpen(false); }}
            className={`p-2 rounded-lg transition-colors ${mobileView === "editor" ? "bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))]" : "text-[rgb(var(--text-secondary))]"}`}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <button
            onClick={() => { setMobileView("ai"); setAiPanelOpen(true); setSidebarOpen(false); }}
            className={`p-2 rounded-lg transition-colors ${mobileView === "ai" ? "bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))]" : "text-[rgb(var(--text-secondary))]"}`}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2a8 8 0 0 0-8 8c0 6 8 12 8 12s8-6 8-12a8 8 0 0 0-8-8Z"/><circle cx="12" cy="10" r="3"/></svg>
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - collapsible */}
        {sidebarOpen && (
          <>
            {isMobile && (
              <div
                className="fixed inset-0 bg-black/30 z-40 md:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}
            <div className={`${isMobile ? "fixed inset-y-0 left-0 z-50 w-72" : "w-64 flex-shrink-0"} bg-[rgb(var(--sidebar-bg))] border-r border-[rgb(var(--border))] animate-slide-left`}>
              <Sidebar />
            </div>
          </>
        )}

        {/* Center - Note Editor */}
        <div className={`flex-1 min-w-0 ${isMobile && mobileView !== "editor" ? "hidden" : ""}`}>
          <NoteEditor />
        </div>

        {/* AI Panel - collapsible */}
        {aiPanelOpen && (
          <>
            {isMobile && (
              <div
                className="fixed inset-0 bg-black/30 z-40 md:hidden"
                onClick={() => setAiPanelOpen(false)}
              />
            )}
            <div className={`${isMobile ? "fixed inset-y-0 right-0 z-50 w-80" : "w-80 flex-shrink-0"} bg-[rgb(var(--sidebar-bg))] border-l border-[rgb(var(--border))] animate-slide-right`}>
              <AiPanel />
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {settingsOpen && <SettingsModal />}
      {commandPaletteOpen && <CommandPalette />}
      <ToastContainer />
    </div>
  );
}
