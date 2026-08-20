"use client";
import { create } from "zustand";

export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  tags: string[];
  isFavorite: boolean;
  isPinned: boolean;
  isDeleted: boolean;
  color: string | null;
  icon: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AIConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

export type SidebarView = "notes" | "favorites" | "pinned" | "trash" | "folder" | "tag" | "search" | "templates";
export type Theme = "light" | "dark" | "system";

interface AppState {
  // Auth
  userEmail: string | null;
  setUserEmail: (e: string | null) => void;

  // UI
  sidebarOpen: boolean;
  aiPanelOpen: boolean;
  settingsOpen: boolean;
  commandPaletteOpen: boolean;
  sidebarView: SidebarView;
  selectedFolderId: string | null;
  selectedTagName: string | null;
  searchQuery: string;
  mobileView: "sidebar" | "editor" | "ai";

  // Data
  notes: Note[];
  folders: Folder[];
  currentNoteId: string | null;

  // AI
  aiConversations: AIConversation[];
  currentConversationId: string | null;
  aiMessages: AIMessage[];
  aiStreaming: boolean;
  aiNoteContext: boolean;

  // Theme
  theme: Theme;

  // Sounds
  soundEnabled: boolean;
  typingSoundsEnabled: boolean;
  masterVolume: number;

  // Save status
  saveStatus: "idle" | "saving" | "saved" | "error";

  // Toasts
  toasts: Toast[];

  // Actions
  setSidebarOpen: (open: boolean) => void;
  setAiPanelOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setSidebarView: (view: SidebarView) => void;
  setSelectedFolderId: (id: string | null) => void;
  setSelectedTagName: (name: string | null) => void;
  setSearchQuery: (q: string) => void;
  setMobileView: (view: "sidebar" | "editor" | "ai") => void;

  setNotes: (notes: Note[]) => void;
  setFolders: (folders: Folder[]) => void;
  setCurrentNoteId: (id: string | null) => void;
  updateNote: (id: string, data: Partial<Note>) => void;
  addNote: (note: Note) => void;
  removeNote: (id: string) => void;
  addFolder: (folder: Folder) => void;
  updateFolder: (id: string, data: Partial<Folder>) => void;
  removeFolder: (id: string) => void;

  setAiConversations: (convos: AIConversation[]) => void;
  setCurrentConversationId: (id: string | null) => void;
  setAiMessages: (msgs: AIMessage[]) => void;
  addAiMessage: (msg: AIMessage) => void;
  updateAiMessage: (id: string, content: string) => void;
  setAiStreaming: (s: boolean) => void;
  setAiNoteContext: (c: boolean) => void;
  addAiConversation: (c: AIConversation) => void;
  removeAiConversation: (id: string) => void;

  setTheme: (t: Theme) => void;
  setSoundEnabled: (e: boolean) => void;
  setTypingSoundsEnabled: (e: boolean) => void;
  setMasterVolume: (v: number) => void;
  setSaveStatus: (s: "idle" | "saving" | "saved" | "error") => void;

  addToast: (t: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  userEmail: null,
  setUserEmail: (e) => set({ userEmail: e }),

  sidebarOpen: true,
  aiPanelOpen: false,
  settingsOpen: false,
  commandPaletteOpen: false,
  sidebarView: "notes",
  selectedFolderId: null,
  selectedTagName: null,
  searchQuery: "",
  mobileView: "sidebar",

  notes: [],
  folders: [],
  currentNoteId: null,

  aiConversations: [],
  currentConversationId: null,
  aiMessages: [],
  aiStreaming: false,
  aiNoteContext: true,

  theme: "light",

  soundEnabled: true,
  typingSoundsEnabled: false,
  masterVolume: 50,

  saveStatus: "idle",

  toasts: [],

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setAiPanelOpen: (open) => set({ aiPanelOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setSidebarView: (view) => set({ sidebarView: view }),
  setSelectedFolderId: (id) => set({ selectedFolderId: id }),
  setSelectedTagName: (name) => set({ selectedTagName: name }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setMobileView: (view) => set({ mobileView: view }),

  setNotes: (notes) => set({ notes }),
  setFolders: (folders) => set({ folders }),
  setCurrentNoteId: (id) => set({ currentNoteId: id }),
  updateNote: (id, data) => set((s) => ({ notes: s.notes.map((n) => n.id === id ? { ...n, ...data } : n) })),
  addNote: (note) => set((s) => ({ notes: [note, ...s.notes] })),
  removeNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
  addFolder: (folder) => set((s) => ({ folders: [...s.folders, folder] })),
  updateFolder: (id, data) => set((s) => ({ folders: s.folders.map((f) => f.id === id ? { ...f, ...data } : f) })),
  removeFolder: (id) => set((s) => ({ folders: s.folders.filter((f) => f.id !== id) })),

  setAiConversations: (convos) => set({ aiConversations: convos }),
  setCurrentConversationId: (id) => set({ currentConversationId: id }),
  setAiMessages: (msgs) => set({ aiMessages: msgs }),
  addAiMessage: (msg) => set((s) => ({ aiMessages: [...s.aiMessages, msg] })),
  updateAiMessage: (id, content) => set((s) => ({
    aiMessages: s.aiMessages.map((m) => m.id === id ? { ...m, content } : m),
  })),
  setAiStreaming: (s) => set({ aiStreaming: s }),
  setAiNoteContext: (c) => set({ aiNoteContext: c }),
  addAiConversation: (c) => set((s) => ({ aiConversations: [c, ...s.aiConversations] })),
  removeAiConversation: (id) => set((s) => ({
    aiConversations: s.aiConversations.filter((c) => c.id !== id),
    currentConversationId: s.currentConversationId === id ? null : s.currentConversationId,
  })),

  setTheme: (t) => set({ theme: t }),
  setSoundEnabled: (e) => set({ soundEnabled: e }),
  setTypingSoundsEnabled: (e) => set({ typingSoundsEnabled: e }),
  setMasterVolume: (v) => set({ masterVolume: v }),
  setSaveStatus: (s) => set({ saveStatus: s }),

  addToast: (t) => set((s) => ({ toasts: [...s.toasts, { ...t, id: Date.now().toString() }] })),
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
