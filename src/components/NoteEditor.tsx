"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAppStore, type Note } from "@/lib/store";
import { playSave, playClick, playDelete } from "@/lib/sounds";
import { formatDistanceToNow, format } from "date-fns";

const AUTOSAVE_DELAY = 1500;

const NOTE_COLORS = [
  null, "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
  "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
];

const EMOJI_ICONS = ["📝", "📄", "📋", "📓", "📒", "📕", "📗", "📘", "📙", "💡", "🎯", "🚀", "⭐", "🔥", "💻", "🎓", "🧪", "🎨", "🎵", "📸"];

interface NoteVersion {
  id: string;
  noteId: string;
  title: string;
  content: string;
  createdAt: string;
}

interface AttachmentMeta {
  id: string;
  noteId: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export function NoteEditor() {
  const {
    currentNoteId, notes, updateNote, setCurrentNoteId, setNotes,
    setSaveStatus, saveStatus, addToast, soundEnabled, masterVolume,
    sidebarOpen, setSidebarOpen, setAiPanelOpen, aiPanelOpen,
    folders, setMobileView,
  } = useAppStore();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showMoveToFolder, setShowMoveToFolder] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [attachmentsList, setAttachmentsList] = useState<AttachmentMeta[]>([]);
  const [showExport, setShowExport] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const vol = masterVolume / 100;

  const currentNote = notes.find((n) => n.id === currentNoteId);

  // Load note content when selected
  useEffect(() => {
    if (currentNote) {
      setTitle(currentNote.title);
      setContent(currentNote.content || "");
      setNoteTags(currentNote.tags || []);
      loadAttachments(currentNote.id);
    }
  }, [currentNoteId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadAttachments(noteId: string) {
    try {
      const res = await fetch(`/api/attachments?noteId=${noteId}`);
      if (res.ok) setAttachmentsList(await res.json());
    } catch { /* ignore */ }
  }

  const saveNote = useCallback(
    async (updates: Partial<Note>) => {
      if (!currentNoteId) return;
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/notes/${currentNoteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (res.ok) {
          const updated = await res.json();
          updateNote(currentNoteId, updated);
          setSaveStatus("saved");
          if (soundEnabled) playSave(vol);
        } else {
          setSaveStatus("error");
        }
      } catch {
        setSaveStatus("error");
        addToast({ message: "Couldn't save. Will retry.", type: "error" });
      }
    },
    [currentNoteId, setSaveStatus, updateNote, soundEnabled, vol, addToast]
  );

  // Autosave
  function scheduleAutosave(newTitle: string, newContent: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveNote({ title: newTitle, content: newContent });
    }, AUTOSAVE_DELAY);
  }

  function handleTitleChange(v: string) {
    setTitle(v);
    scheduleAutosave(v, content);
  }

  function handleContentChange(v: string) {
    setContent(v);
    scheduleAutosave(title, v);
  }

  async function toggleFavorite() {
    if (!currentNote) return;
    if (soundEnabled) playClick(vol);
    await saveNote({ isFavorite: !currentNote.isFavorite });
  }

  async function togglePin() {
    if (!currentNote) return;
    if (soundEnabled) playClick(vol);
    await saveNote({ isPinned: !currentNote.isPinned });
  }

  async function deleteNote() {
    if (!currentNote) return;
    if (soundEnabled) playDelete(vol);
    await saveNote({ isDeleted: true, deletedAt: new Date().toISOString() });
    setCurrentNoteId(null);
    addToast({ message: "Note moved to trash", type: "info" });
  }

  async function setNoteColor(color: string | null) {
    if (soundEnabled) playClick(vol);
    await saveNote({ color });
    setShowColorPicker(false);
  }

  async function setNoteIcon(icon: string) {
    if (soundEnabled) playClick(vol);
    await saveNote({ icon });
    setShowIconPicker(false);
  }

  async function addTag() {
    if (!tagInput.trim() || !currentNote) return;
    const newTags = [...noteTags, tagInput.trim()];
    setNoteTags(newTags);
    setTagInput("");
    await saveNote({ tags: newTags });
  }

  async function removeTag(tag: string) {
    if (!currentNote) return;
    const newTags = noteTags.filter((t) => t !== tag);
    setNoteTags(newTags);
    await saveNote({ tags: newTags });
  }

  async function moveToFolder(folderId: string | null) {
    if (soundEnabled) playClick(vol);
    await saveNote({ folderId });
    setShowMoveToFolder(false);
    addToast({ message: folderId ? "Note moved" : "Note unorganized", type: "success" });
  }

  async function loadVersions() {
    if (!currentNoteId) return;
    try {
      const res = await fetch(`/api/notes/${currentNoteId}/versions`);
      if (res.ok) setVersions(await res.json());
    } catch { /* ignore */ }
    setShowVersions(true);
  }

  async function restoreVersion(v: NoteVersion) {
    if (!confirm("Restore this version? Current content will be saved as a version.")) return;
    setTitle(v.title);
    setContent(v.content);
    await saveNote({ title: v.title, content: v.content });
    setShowVersions(false);
    addToast({ message: "Version restored", type: "success" });
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length || !currentNoteId) return;
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        addToast({ message: `${file.name} is too large (max 10MB)`, type: "error" });
        continue;
      }
      const formData = new FormData();
      formData.append("file", file);
      formData.append("noteId", currentNoteId);
      try {
        const res = await fetch("/api/attachments", { method: "POST", body: formData });
        if (res.ok) {
          const att = await res.json();
          setAttachmentsList((prev) => [...prev, att]);
          addToast({ message: `${file.name} uploaded`, type: "success" });
        } else {
          addToast({ message: `Failed to upload ${file.name}`, type: "error" });
        }
      } catch {
        addToast({ message: `Failed to upload ${file.name}`, type: "error" });
      }
    }
    e.target.value = "";
  }

  async function deleteAttachment(id: string) {
    try {
      await fetch(`/api/attachments/${id}`, { method: "DELETE" });
      setAttachmentsList((prev) => prev.filter((a) => a.id !== id));
      addToast({ message: "Attachment deleted", type: "success" });
    } catch {
      addToast({ message: "Failed to delete attachment", type: "error" });
    }
  }

  function exportNote(format: string) {
    if (!currentNote) return;
    let blob: Blob;
    let ext: string;
    if (format === "md") {
      blob = new Blob([`# ${title}\n\n${content}`], { type: "text/markdown" });
      ext = "md";
    } else {
      blob = new Blob([`${title}\n\n${content.replace(/[#*\-\[\]>]/g, "")}`], { type: "text/plain" });
      ext = "txt";
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "note"}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExport(false);
    addToast({ message: `Exported as .${ext}`, type: "success" });
  }

  // Insert formatting
  function insertFormat(before: string, after = "") {
    const ta = contentRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.substring(start, end);
    const newContent = content.substring(0, start) + before + selected + after + content.substring(end);
    setContent(newContent);
    scheduleAutosave(title, newContent);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 10);
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Empty state
  if (!currentNote) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="text-6xl mb-4">✦</div>
        <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-[rgb(var(--accent))] to-purple-500 bg-clip-text text-transparent">
          Welcome to Nexus Notes
        </h2>
        <p className="text-[rgb(var(--text-secondary))] mb-6 max-w-md">
          Your AI-powered workspace for writing, organizing, and thinking. Select a note from the sidebar or create a new one to get started.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => { setSidebarOpen(true); setMobileView("sidebar"); }}
            className="px-4 py-2.5 bg-gradient-to-r from-[rgb(var(--accent))] to-purple-500 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-all"
          >
            Browse Notes
          </button>
          <button
            onClick={() => { setAiPanelOpen(true); setMobileView("ai"); }}
            className="px-4 py-2.5 border border-purple-300 text-purple-600 dark:text-purple-400 dark:border-purple-700 rounded-lg text-sm font-medium hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
          >
            🤖 Ask AI
          </button>
        </div>
        <div className="mt-8 flex items-center gap-4 text-xs text-[rgb(var(--text-secondary))]">
          <span>⌘K Command Palette</span>
          <span>⌘B Toggle Sidebar</span>
          <span>⌘\ Toggle AI</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[rgb(var(--border))] bg-[rgb(var(--sidebar-bg))]">
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setSidebarOpen(!sidebarOpen); setMobileView("sidebar"); }}
            className="p-2 rounded-lg text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg))] transition-colors md:hidden"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          </button>

          {/* Format buttons */}
          <div className="hidden sm:flex items-center gap-0.5 border-r border-[rgb(var(--border))] pr-2 mr-1">
            <button onClick={() => insertFormat("**", "**")} className="p-1.5 rounded text-xs font-bold hover:bg-[rgb(var(--bg))] transition-colors" title="Bold (⌘B)">B</button>
            <button onClick={() => insertFormat("*", "*")} className="p-1.5 rounded text-xs italic hover:bg-[rgb(var(--bg))] transition-colors" title="Italic (⌘I)">I</button>
            <button onClick={() => insertFormat("~~", "~~")} className="p-1.5 rounded text-xs line-through hover:bg-[rgb(var(--bg))] transition-colors" title="Strikethrough">S</button>
            <button onClick={() => insertFormat("## ")} className="p-1.5 rounded text-xs font-bold hover:bg-[rgb(var(--bg))] transition-colors" title="Heading">H</button>
            <button onClick={() => insertFormat("- ")} className="p-1.5 rounded text-xs hover:bg-[rgb(var(--bg))] transition-colors" title="Bullet List">•</button>
            <button onClick={() => insertFormat("1. ")} className="p-1.5 rounded text-xs hover:bg-[rgb(var(--bg))] transition-colors" title="Numbered List">1.</button>
            <button onClick={() => insertFormat("- [ ] ")} className="p-1.5 rounded text-xs hover:bg-[rgb(var(--bg))] transition-colors" title="Checklist">☐</button>
            <button onClick={() => insertFormat("> ")} className="p-1.5 rounded text-xs hover:bg-[rgb(var(--bg))] transition-colors" title="Quote">❝</button>
            <button onClick={() => insertFormat("```\n", "\n```")} className="p-1.5 rounded text-xs hover:bg-[rgb(var(--bg))] transition-colors font-mono" title="Code Block">&lt;/&gt;</button>
            <button onClick={() => insertFormat("[", "](url)")} className="p-1.5 rounded text-xs hover:bg-[rgb(var(--bg))] transition-colors" title="Link">🔗</button>
            <button onClick={() => insertFormat("\n---\n")} className="p-1.5 rounded text-xs hover:bg-[rgb(var(--bg))] transition-colors" title="Divider">—</button>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Save status */}
          <span className="text-xs text-[rgb(var(--text-secondary))] mr-2">
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "saved" && "✓ Saved"}
            {saveStatus === "error" && (
              <span className="text-red-500 cursor-pointer" onClick={() => saveNote({ title, content })}>
                ⚠ Retry
              </span>
            )}
          </span>

          <button onClick={toggleFavorite} className={`p-2 rounded-lg transition-colors ${currentNote.isFavorite ? "text-yellow-500" : "text-[rgb(var(--text-secondary))] hover:text-yellow-500"}`} title="Favorite">
            {currentNote.isFavorite ? "⭐" : "☆"}
          </button>
          <button onClick={togglePin} className={`p-2 rounded-lg transition-colors ${currentNote.isPinned ? "text-[rgb(var(--accent))]" : "text-[rgb(var(--text-secondary))]"} hover:bg-[rgb(var(--bg))]`} title="Pin">
            📌
          </button>
          <div className="relative">
            <button onClick={() => setShowColorPicker(!showColorPicker)} className="p-2 rounded-lg text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg))] transition-colors" title="Color">
              <div className="w-4 h-4 rounded-full border-2 border-current" style={currentNote.color ? { backgroundColor: currentNote.color, borderColor: currentNote.color } : undefined} />
            </button>
            {showColorPicker && (
              <div className="absolute right-0 top-full mt-1 p-2 bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))] rounded-lg shadow-xl z-50 animate-fade-in">
                <div className="grid grid-cols-6 gap-1.5">
                  {NOTE_COLORS.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => setNoteColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${currentNote.color === c ? "ring-2 ring-[rgb(var(--accent))] ring-offset-1" : ""}`}
                      style={{ backgroundColor: c || "transparent", borderColor: c || "rgb(var(--border))" }}
                    >
                      {!c && <span className="text-xs">✕</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="relative">
            <button onClick={() => setShowIconPicker(!showIconPicker)} className="p-2 rounded-lg text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg))] transition-colors" title="Icon">
              {currentNote.icon}
            </button>
            {showIconPicker && (
              <div className="absolute right-0 top-full mt-1 p-2 bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))] rounded-lg shadow-xl z-50 animate-fade-in">
                <div className="grid grid-cols-5 gap-1">
                  {EMOJI_ICONS.map((e) => (
                    <button key={e} onClick={() => setNoteIcon(e)} className="w-8 h-8 rounded hover:bg-[rgb(var(--bg))] transition-colors text-lg flex items-center justify-center">
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="relative">
            <button onClick={() => setShowMoveToFolder(!showMoveToFolder)} className="p-2 rounded-lg text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg))] transition-colors" title="Move to folder">
              📁
            </button>
            {showMoveToFolder && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))] rounded-lg shadow-xl z-50 animate-fade-in overflow-hidden">
                <button onClick={() => moveToFolder(null)} className="w-full px-3 py-2 text-sm text-left hover:bg-[rgb(var(--bg))] transition-colors">
                  📋 No Folder
                </button>
                {folders.map((f) => (
                  <button key={f.id} onClick={() => moveToFolder(f.id)} className={`w-full px-3 py-2 text-sm text-left hover:bg-[rgb(var(--bg))] transition-colors ${currentNote.folderId === f.id ? "text-[rgb(var(--accent))] font-medium" : ""}`}>
                    {f.icon} {f.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <label className="p-2 rounded-lg text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg))] transition-colors cursor-pointer" title="Upload file">
            📎
            <input type="file" multiple className="hidden" onChange={handleFileUpload} />
          </label>

          <div className="relative">
            <button onClick={() => setShowExport(!showExport)} className="p-2 rounded-lg text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg))] transition-colors" title="Export">
              ⬇️
            </button>
            {showExport && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))] rounded-lg shadow-xl z-50 animate-fade-in overflow-hidden">
                <button onClick={() => exportNote("txt")} className="w-full px-3 py-2 text-sm text-left hover:bg-[rgb(var(--bg))] transition-colors">📄 Plain Text</button>
                <button onClick={() => exportNote("md")} className="w-full px-3 py-2 text-sm text-left hover:bg-[rgb(var(--bg))] transition-colors">📝 Markdown</button>
              </div>
            )}
          </div>

          <button onClick={loadVersions} className="p-2 rounded-lg text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg))] transition-colors" title="Version History">
            🕐
          </button>

          <button onClick={deleteNote} className="p-2 rounded-lg text-[rgb(var(--text-secondary))] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete">
            🗑️
          </button>

          <button
            onClick={() => setAiPanelOpen(!aiPanelOpen)}
            className={`p-2 rounded-lg transition-colors ${aiPanelOpen ? "text-purple-500 bg-purple-50 dark:bg-purple-900/20" : "text-[rgb(var(--text-secondary))] hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20"}`}
            title="AI Assistant (⌘\\)"
          >
            🤖
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full">
        {/* Note icon and title */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setShowIconPicker(!showIconPicker)}
            className="text-3xl hover:scale-110 transition-transform"
          >
            {currentNote.icon}
          </button>
          <input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Untitled"
            className="flex-1 text-2xl md:text-3xl font-bold bg-transparent focus:outline-none placeholder:text-[rgb(var(--text-secondary))]/40"
          />
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-3 mb-4 text-xs text-[rgb(var(--text-secondary))]">
          <span>Created {format(new Date(currentNote.createdAt), "MMM d, yyyy")}</span>
          <span>·</span>
          <span>Updated {formatDistanceToNow(new Date(currentNote.updatedAt), { addSuffix: true })}</span>
          {currentNote.folderId && (
            <>
              <span>·</span>
              <span>{folders.find((f) => f.id === currentNote.folderId)?.icon} {folders.find((f) => f.id === currentNote.folderId)?.name}</span>
            </>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1.5 mb-6">
          {noteTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))] rounded-full"
            >
              #{tag}
              <button onClick={() => removeTag(tag)} className="hover:text-red-500 ml-0.5">×</button>
            </span>
          ))}
          <div className="inline-flex items-center">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTag()}
              placeholder="+ Add tag"
              className="w-20 px-2 py-1 text-xs bg-transparent focus:outline-none focus:w-32 transition-all placeholder:text-[rgb(var(--text-secondary))]/60"
            />
          </div>
        </div>

        {/* Content editor (markdown textarea) */}
        <div className="note-editor">
          <textarea
            ref={contentRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Start writing... (supports Markdown)"
            className="w-full min-h-[400px] bg-transparent resize-none focus:outline-none text-base leading-relaxed placeholder:text-[rgb(var(--text-secondary))]/40"
            style={{ fontFamily: "inherit" }}
          />
        </div>

        {/* Attachments */}
        {attachmentsList.length > 0 && (
          <div className="mt-6 border-t border-[rgb(var(--border))] pt-4">
            <h3 className="text-sm font-medium mb-3 text-[rgb(var(--text-secondary))]">📎 Attachments</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {attachmentsList.map((att) => (
                <div key={att.id} className="flex items-center gap-3 p-3 bg-[rgb(var(--bg))] rounded-lg border border-[rgb(var(--border))]">
                  {att.mimeType.startsWith("image/") ? (
                    <img
                      src={`/api/attachments/${att.id}`}
                      alt={att.filename}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : att.mimeType.startsWith("audio/") ? (
                    <div className="w-12 h-12 flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 rounded text-xl">🎵</div>
                  ) : att.mimeType.startsWith("video/") ? (
                    <div className="w-12 h-12 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 rounded text-xl">🎬</div>
                  ) : (
                    <div className="w-12 h-12 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded text-xl">📄</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <a href={`/api/attachments/${att.id}`} target="_blank" rel="noreferrer" className="text-sm font-medium truncate block hover:text-[rgb(var(--accent))]">
                      {att.filename}
                    </a>
                    <span className="text-xs text-[rgb(var(--text-secondary))]">{formatSize(att.size)}</span>
                  </div>
                  <button
                    onClick={() => deleteAttachment(att.id)}
                    className="p-1.5 rounded text-[rgb(var(--text-secondary))] hover:text-red-500 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audio/Video preview */}
        {attachmentsList.filter((a) => a.mimeType.startsWith("audio/")).length > 0 && (
          <div className="mt-4">
            {attachmentsList.filter((a) => a.mimeType.startsWith("audio/")).map((a) => (
              <audio key={a.id} controls className="w-full mb-2" src={`/api/attachments/${a.id}`} />
            ))}
          </div>
        )}
        {attachmentsList.filter((a) => a.mimeType.startsWith("video/")).length > 0 && (
          <div className="mt-4">
            {attachmentsList.filter((a) => a.mimeType.startsWith("video/")).map((a) => (
              <video key={a.id} controls className="w-full rounded-lg mb-2" src={`/api/attachments/${a.id}`} />
            ))}
          </div>
        )}
      </div>

      {/* Version History Modal */}
      {showVersions && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowVersions(false)}>
          <div className="bg-[rgb(var(--card-bg))] rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[rgb(var(--border))]">
              <h2 className="font-semibold">🕐 Version History</h2>
              <button onClick={() => setShowVersions(false)} className="p-1 rounded hover:bg-[rgb(var(--bg))]">✕</button>
            </div>
            <div className="overflow-y-auto max-h-96">
              {versions.length === 0 ? (
                <div className="p-8 text-center text-[rgb(var(--text-secondary))]">
                  <p className="text-3xl mb-2">🕐</p>
                  <p className="text-sm">No previous versions yet</p>
                </div>
              ) : (
                versions.map((v) => (
                  <div key={v.id} className="p-4 border-b border-[rgb(var(--border))] hover:bg-[rgb(var(--bg))] transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm">{v.title}</span>
                      <span className="text-xs text-[rgb(var(--text-secondary))]">
                        {format(new Date(v.createdAt), "MMM d, h:mm a")}
                      </span>
                    </div>
                    <p className="text-xs text-[rgb(var(--text-secondary))] mb-2 truncate">
                      {v.content?.substring(0, 100)}
                    </p>
                    <button
                      onClick={() => restoreVersion(v)}
                      className="text-xs text-[rgb(var(--accent))] hover:underline"
                    >
                      Restore this version
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
