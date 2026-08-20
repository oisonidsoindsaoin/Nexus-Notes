"use client";

import { useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { LoginScreen } from "./LoginScreen";
import { Sidebar } from "./Sidebar";
import { NoteEditor } from "./NoteEditor";
import { AiPanel } from "./AiPanel";
import { SettingsModal } from "./SettingsModal";
import { CommandPalette } from "./CommandPalette";
import { ToastContainer } from "./ToastContainer";

export function AppShell() {
  const {
    userEmail, setUserEmail,
    sidebarOpen, aiPanelOpen, settingsOpen, commandPaletteOpen,
    setNotes, setFolders, setAiConversations, theme,
    mobileView, setMobileView,
    setCommandPaletteOpen, setSettingsOpen, setAiPanelOpen, setSidebarOpen,
  } = useAppStore();

  // Check for saved email
  useEffect(() => {
    const saved = localStorage.getItem("nexus-email");
    if (saved) setUserEmail(saved);
  }, [setUserEmail]);

  // Load data when logged in
  useEffect(() => {
    if (!userEmail) return;
    async function load() {
      const headers = { "x-user-email": userEmail! };
      try {
        // Run migration
        await fetch("/api/migrate", { method: "POST" }).catch(() => {});
        const [notesRes, foldersRes, convosRes] = await Promise.all([
          fetch("/api/notes", { headers }),
          fetch("/api/folders", { headers }),
          fetch("/api/ai/conversations", { headers }),
        ]);
        if (notesRes.ok) setNotes(await notesRes.json());
        if (foldersRes.ok) setFolders(await foldersRes.json());
        if (convosRes.ok) setAiConversations(await convosRes.json());
      } catch (e) {
        console.error("Failed to load data:", e);
      }
    }
    load();
  }, [userEmail, setNotes, setFolders, setAiConversations]);

  // Theme
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
      if (isMod && e.key === "k") { e.preventDefault(); setCommandPaletteOpen(!commandPaletteOpen); }
      if (isMod && e.key === ",") { e.preventDefault(); setSettingsOpen(true); }
      if (isMod && e.key === "\\") { e.preventDefault(); setAiPanelOpen(!aiPanelOpen); }
      if (isMod && e.key === "b") { e.preventDefault(); setSidebarOpen(!sidebarOpen); }
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
      if (isMobile) { setSidebarOpen(false); setAiPanelOpen(false); }
      else { setSidebarOpen(true); }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [setSidebarOpen, setAiPanelOpen]);

  // Show login if no email
  if (!userEmail) return <LoginScreen />;

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div className="h-screen flex flex-col bg-[rgb(var(--bg))]">
      {/* Mobile nav */}
      <div className="md:hidden flex items-center justify-between px-4 py-2.5 border-b border-[rgb(var(--border))] bg-[rgb(var(--sidebar-bg))]">
        <button
          onClick={() => { setMobileView("sidebar"); setSidebarOpen(true); }}
          className={`p-2 rounded-xl transition-colors ${mobileView === "sidebar" ? "bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))]" : "text-[rgb(var(--text-secondary))]"}`}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
        </button>
        <div className="flex items-center gap-1.5">
          <span className="text-lg">✦</span>
          <span className="font-bold text-sm bg-gradient-to-r from-[rgb(var(--accent))] to-purple-500 bg-clip-text text-transparent">Nexus</span>
        </div>
        <div className="flex gap-0.5">
          <button
            onClick={() => { setMobileView("editor"); setSidebarOpen(false); setAiPanelOpen(false); }}
            className={`p-2 rounded-xl transition-colors ${mobileView === "editor" ? "bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))]" : "text-[rgb(var(--text-secondary))]"}`}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <button
            onClick={() => { setMobileView("ai"); setAiPanelOpen(true); setSidebarOpen(false); }}
            className={`p-2 rounded-xl transition-colors ${mobileView === "ai" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" : "text-[rgb(var(--text-secondary))]"}`}
          >
            🤖
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {sidebarOpen && (
          <>
            {isMobile && <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}
            <div className={`${isMobile ? "fixed inset-y-0 left-0 z-50 w-72" : "w-[270px] flex-shrink-0"} bg-[rgb(var(--sidebar-bg))] border-r border-[rgb(var(--border))] animate-slide-left`}>
              <Sidebar />
            </div>
          </>
        )}

        <div className={`flex-1 min-w-0 ${isMobile && mobileView !== "editor" ? "hidden" : ""}`}>
          <NoteEditor />
        </div>

        {aiPanelOpen && (
          <>
            {isMobile && <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setAiPanelOpen(false)} />}
            <div className={`${isMobile ? "fixed inset-y-0 right-0 z-50 w-80" : "w-80 flex-shrink-0"} bg-[rgb(var(--sidebar-bg))] border-l border-[rgb(var(--border))] animate-slide-right`}>
              <AiPanel />
            </div>
          </>
        )}
      </div>

      {settingsOpen && <SettingsModal />}
      {commandPaletteOpen && <CommandPalette />}
      <ToastContainer />
    </div>
  );
}
