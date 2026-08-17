"use client";

import { useState } from "react";
import { useAppStore, type Note, type SidebarView } from "@/lib/store";
import { playClick } from "@/lib/sounds";
import { formatDistanceToNow } from "date-fns";
import { templates } from "@/lib/templates";

export function Sidebar() {
  const {
    notes, folders, sidebarView, setSidebarView, currentNoteId,
    setCurrentNoteId, setSelectedFolderId, selectedFolderId,
    setSelectedTagName, selectedTagName, searchQuery, setSearchQuery,
    addNote, setNotes, addFolder, updateFolder, removeFolder,
    setSidebarOpen, setMobileView, setSaveStatus, addToast,
    soundEnabled, masterVolume, setAiPanelOpen,
    setSettingsOpen, setCommandPaletteOpen,
  } = useAppStore();

  const [folderInput, setFolderInput] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);

  const vol = masterVolume / 100;

  const activeNotes = notes.filter((n) => !n.isDeleted);
  const deletedNotes = notes.filter((n) => n.isDeleted);

  const allTags = Array.from(new Set(activeNotes.flatMap((n) => n.tags || [])));

  const getVisibleNotes = (): Note[] => {
    let filtered = sidebarView === "trash" ? deletedNotes : activeNotes;

    if (sidebarView === "favorites") filtered = filtered.filter((n) => n.isFavorite);
    if (sidebarView === "pinned") filtered = filtered.filter((n) => n.isPinned);
    if (sidebarView === "folder" && selectedFolderId)
      filtered = filtered.filter((n) => n.folderId === selectedFolderId);
    if (sidebarView === "tag" && selectedTagName)
      filtered = filtered.filter((n) => n.tags?.includes(selectedTagName));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.content || "").toLowerCase().includes(q)
      );
    }

    return filtered;
  };

  const visibleNotes = getVisibleNotes();

  async function createNote(content = "", title = "Untitled") {
    if (soundEnabled) playClick(vol);
    try {
      setSaveStatus("saving");
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          folderId: sidebarView === "folder" ? selectedFolderId : null,
        }),
      });
      if (res.ok) {
        const note = await res.json();
        addNote(note);
        setCurrentNoteId(note.id);
        setSaveStatus("saved");
        addToast({ message: "Note created", type: "success" });
        // On mobile, switch to editor
        setMobileView("editor");
        setSidebarOpen(false);
      } else {
        setSaveStatus("error");
        addToast({ message: "Failed to create note", type: "error" });
      }
    } catch {
      setSaveStatus("error");
      addToast({ message: "Failed to create note", type: "error" });
    }
  }

  async function createFolder() {
    if (!folderInput.trim()) return;
    if (soundEnabled) playClick(vol);
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: folderInput.trim() }),
      });
      if (res.ok) {
        const folder = await res.json();
        addFolder(folder);
        setFolderInput("");
        setShowNewFolder(false);
        addToast({ message: "Folder created", type: "success" });
      }
    } catch {
      addToast({ message: "Failed to create folder", type: "error" });
    }
  }

  async function handleDeleteFolder(id: string) {
    if (!confirm("Delete this folder? Notes inside will be unorganized.")) return;
    try {
      await fetch(`/api/folders/${id}`, { method: "DELETE" });
      removeFolder(id);
      if (selectedFolderId === id) {
        setSidebarView("notes");
        setSelectedFolderId(null);
      }
      addToast({ message: "Folder deleted", type: "success" });
    } catch {
      addToast({ message: "Failed to delete folder", type: "error" });
    }
  }

  async function handleRenameFolder(id: string) {
    if (!editFolderName.trim()) return;
    try {
      const res = await fetch(`/api/folders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editFolderName.trim() }),
      });
      if (res.ok) {
        updateFolder(id, { name: editFolderName.trim() });
        setEditingFolder(null);
      }
    } catch {
      addToast({ message: "Failed to rename folder", type: "error" });
    }
  }

  async function handleTrashAction(action: "restore" | "delete", noteId: string) {
    if (soundEnabled) playClick(vol);
    if (action === "restore") {
      try {
        const res = await fetch(`/api/notes/${noteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isDeleted: false, deletedAt: null }),
        });
        if (res.ok) {
          const updated = await res.json();
          const updatedNotes = notes.map((n) => (n.id === noteId ? updated : n));
          setNotes(updatedNotes);
          addToast({ message: "Note restored", type: "success" });
        }
      } catch {
        addToast({ message: "Failed to restore note", type: "error" });
      }
    } else {
      if (!confirm("Permanently delete this note? This cannot be undone.")) return;
      try {
        await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
        const updatedNotes = notes.filter((n) => n.id !== noteId);
        setNotes(updatedNotes);
        if (currentNoteId === noteId) setCurrentNoteId(null);
        addToast({ message: "Note permanently deleted", type: "success" });
      } catch {
        addToast({ message: "Failed to delete note", type: "error" });
      }
    }
  }

  async function emptyTrash() {
    if (!confirm("Permanently delete all notes in trash? This cannot be undone.")) return;
    try {
      for (const n of deletedNotes) {
        await fetch(`/api/notes/${n.id}`, { method: "DELETE" });
      }
      setNotes(notes.filter((n) => !n.isDeleted));
      setCurrentNoteId(null);
      addToast({ message: "Trash emptied", type: "success" });
    } catch {
      addToast({ message: "Failed to empty trash", type: "error" });
    }
  }

  function selectNote(id: string) {
    if (soundEnabled) playClick(vol);
    setCurrentNoteId(id);
    setMobileView("editor");
    setSidebarOpen(false);
  }

  function setView(view: SidebarView) {
    if (soundEnabled) playClick(vol);
    setSidebarView(view);
    setSelectedFolderId(null);
    setSelectedTagName(null);
  }

  const navItems: { view: SidebarView; label: string; icon: string; count?: number }[] = [
    { view: "notes", label: "All Notes", icon: "📋", count: activeNotes.length },
    { view: "favorites", label: "Favorites", icon: "⭐", count: activeNotes.filter((n) => n.isFavorite).length },
    { view: "pinned", label: "Pinned", icon: "📌", count: activeNotes.filter((n) => n.isPinned).length },
    { view: "trash", label: "Trash", icon: "🗑️", count: deletedNotes.length },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[rgb(var(--border))]">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">✦</span>
          <h1 className="font-bold text-lg bg-gradient-to-r from-[rgb(var(--accent))] to-purple-500 bg-clip-text text-transparent">
            Nexus Notes
          </h1>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (sidebarView !== "search" && e.target.value) setSidebarView("search");
              if (!e.target.value && sidebarView === "search") setSidebarView("notes");
            }}
            className="w-full pl-8 pr-3 py-2 text-sm bg-[rgb(var(--bg))] border border-[rgb(var(--border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent))]/30 transition-all"
          />
          <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-[rgb(var(--text-secondary))]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
        </div>
      </div>

      {/* New Note Button */}
      <div className="px-3 pt-3">
        <div className="flex gap-2">
          <button
            onClick={() => createNote()}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-[rgb(var(--accent))] to-purple-500 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-all active:scale-[0.98] shadow-sm"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            New Note
          </button>
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="px-2.5 py-2.5 border border-[rgb(var(--border))] rounded-lg text-sm hover:bg-[rgb(var(--bg))] transition-colors"
            title="Templates"
          >
            📋
          </button>
        </div>

        {/* Templates dropdown */}
        {showTemplates && (
          <div className="mt-2 bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))] rounded-lg shadow-lg overflow-hidden animate-fade-in">
            <div className="p-2 text-xs font-medium text-[rgb(var(--text-secondary))] uppercase tracking-wider">Templates</div>
            <div className="max-h-64 overflow-y-auto">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    createNote(t.content, t.name);
                    setShowTemplates(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[rgb(var(--bg))] transition-colors text-left"
                >
                  <span>{t.icon}</span>
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-[rgb(var(--text-secondary))]">{t.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="px-3 pt-3 space-y-0.5">
        {navItems.map((item) => (
          <button
            key={item.view}
            onClick={() => setView(item.view)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
              sidebarView === item.view && !selectedFolderId && !selectedTagName
                ? "bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))] font-medium"
                : "text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg))] hover:text-[rgb(var(--text))]"
            }`}
          >
            <span>{item.icon}</span>
            <span className="flex-1 text-left">{item.label}</span>
            {item.count !== undefined && item.count > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-[rgb(var(--bg))] text-[rgb(var(--text-secondary))]">
                {item.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Folders */}
      <div className="px-3 pt-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-[rgb(var(--text-secondary))] uppercase tracking-wider px-3">Folders</span>
          <button
            onClick={() => setShowNewFolder(!showNewFolder)}
            className="p-1 rounded text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text))] hover:bg-[rgb(var(--bg))] transition-colors"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>

        {showNewFolder && (
          <div className="flex gap-1 mb-1 animate-fade-in px-1">
            <input
              autoFocus
              value={folderInput}
              onChange={(e) => setFolderInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createFolder()}
              placeholder="Folder name"
              className="flex-1 px-2 py-1.5 text-sm bg-[rgb(var(--bg))] border border-[rgb(var(--border))] rounded focus:outline-none focus:ring-1 focus:ring-[rgb(var(--accent))]/30"
            />
            <button onClick={createFolder} className="px-2 py-1.5 bg-[rgb(var(--accent))] text-white rounded text-xs">Add</button>
          </div>
        )}

        <div className="space-y-0.5">
          {folders.map((f) => (
            <div key={f.id} className="group">
              {editingFolder === f.id ? (
                <div className="flex gap-1 px-1">
                  <input
                    autoFocus
                    value={editFolderName}
                    onChange={(e) => setEditFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRenameFolder(f.id);
                      if (e.key === "Escape") setEditingFolder(null);
                    }}
                    className="flex-1 px-2 py-1 text-sm bg-[rgb(var(--bg))] border border-[rgb(var(--border))] rounded focus:outline-none"
                  />
                  <button onClick={() => handleRenameFolder(f.id)} className="px-2 text-xs text-[rgb(var(--accent))]">✓</button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (soundEnabled) playClick(vol);
                    setSidebarView("folder");
                    setSelectedFolderId(f.id);
                    setSelectedTagName(null);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                    sidebarView === "folder" && selectedFolderId === f.id
                      ? "bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))] font-medium"
                      : "text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg))]"
                  }`}
                >
                  <span style={{ color: f.color }}>{f.icon}</span>
                  <span className="flex-1 text-left truncate">{f.name}</span>
                  <span className="text-xs opacity-0 group-hover:opacity-100 flex gap-0.5">
                    <span
                      onClick={(e) => { e.stopPropagation(); setEditingFolder(f.id); setEditFolderName(f.name); }}
                      className="p-0.5 hover:text-[rgb(var(--accent))] cursor-pointer"
                    >✏️</span>
                    <span
                      onClick={(e) => { e.stopPropagation(); handleDeleteFolder(f.id); }}
                      className="p-0.5 hover:text-red-500 cursor-pointer"
                    >✕</span>
                  </span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tags */}
      {allTags.length > 0 && (
        <div className="px-3 pt-4">
          <span className="text-xs font-medium text-[rgb(var(--text-secondary))] uppercase tracking-wider px-3">Tags</span>
          <div className="flex flex-wrap gap-1 mt-2 px-2">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  if (soundEnabled) playClick(vol);
                  setSidebarView("tag");
                  setSelectedTagName(tag);
                  setSelectedFolderId(null);
                }}
                className={`px-2 py-1 text-xs rounded-full transition-colors ${
                  sidebarView === "tag" && selectedTagName === tag
                    ? "bg-[rgb(var(--accent))] text-white"
                    : "bg-[rgb(var(--bg))] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text))]"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-3">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-medium text-[rgb(var(--text-secondary))] uppercase tracking-wider">
            {sidebarView === "trash" ? "Trash" : sidebarView === "favorites" ? "Favorites" : sidebarView === "pinned" ? "Pinned" :
             sidebarView === "folder" ? folders.find((f) => f.id === selectedFolderId)?.name || "Folder" :
             sidebarView === "tag" ? `#${selectedTagName}` : sidebarView === "search" ? "Search Results" : "Notes"}
          </span>
          {sidebarView === "trash" && deletedNotes.length > 0 && (
            <button onClick={emptyTrash} className="text-xs text-red-500 hover:text-red-600">
              Empty Trash
            </button>
          )}
        </div>

        {visibleNotes.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-3xl mb-2">
              {sidebarView === "trash" ? "🗑️" : sidebarView === "favorites" ? "⭐" : sidebarView === "search" ? "🔍" : "📝"}
            </div>
            <p className="text-sm text-[rgb(var(--text-secondary))]">
              {sidebarView === "trash"
                ? "Trash is empty"
                : sidebarView === "favorites"
                ? "No favorite notes yet"
                : sidebarView === "search"
                ? "No results found"
                : "No notes yet"}
            </p>
            {sidebarView === "notes" && (
              <button
                onClick={() => createNote()}
                className="mt-3 text-sm text-[rgb(var(--accent))] hover:underline"
              >
                Create your first note →
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {visibleNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => sidebarView !== "trash" && selectNote(note.id)}
                className={`group p-3 rounded-lg cursor-pointer transition-all border ${
                  currentNoteId === note.id
                    ? "border-[rgb(var(--accent))]/30 bg-[rgb(var(--accent))]/5 shadow-sm"
                    : "border-transparent hover:bg-[rgb(var(--bg))] hover:border-[rgb(var(--border))]"
                }`}
                style={note.color ? { borderLeftColor: note.color, borderLeftWidth: 3 } : undefined}
              >
                <div className="flex items-start gap-2">
                  <span className="text-sm mt-0.5">{note.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{note.title || "Untitled"}</h3>
                    <p className="text-xs text-[rgb(var(--text-secondary))] mt-0.5 truncate">
                      {note.content ? note.content.replace(/[#*\-\[\]]/g, "").substring(0, 60) : "Empty note"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-[rgb(var(--text-secondary))]">
                        {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                      </span>
                      {note.isPinned && <span className="text-[10px]">📌</span>}
                      {note.isFavorite && <span className="text-[10px]">⭐</span>}
                    </div>
                  </div>
                </div>

                {sidebarView === "trash" && (
                  <div className="flex gap-1 mt-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleTrashAction("restore", note.id); }}
                      className="flex-1 text-xs py-1 rounded bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))] hover:bg-[rgb(var(--accent))]/20"
                    >
                      Restore
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleTrashAction("delete", note.id); }}
                      className="flex-1 text-xs py-1 rounded bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="border-t border-[rgb(var(--border))] p-2 flex items-center gap-1">
        <button
          onClick={() => { if (soundEnabled) playClick(vol); setAiPanelOpen(true); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg))] hover:text-purple-500 transition-colors"
        >
          <span>🤖</span> AI Assistant
        </button>
        <button
          onClick={() => { if (soundEnabled) playClick(vol); setSettingsOpen(true); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg))] hover:text-[rgb(var(--text))] transition-colors"
        >
          <span>⚙️</span> Settings
        </button>
        <button
          onClick={() => { if (soundEnabled) playClick(vol); setCommandPaletteOpen(true); }}
          className="p-2 rounded-lg text-xs text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg))] transition-colors"
          title="⌘K"
        >
          ⌨️
        </button>
      </div>
    </div>
  );
}
