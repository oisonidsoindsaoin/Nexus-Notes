"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAppStore, type Note } from "@/lib/store";
import { playSave, playClick, playDelete } from "@/lib/sounds";
import { formatDistanceToNow, format } from "date-fns";

const AUTOSAVE_DELAY = 1500;

const COLOR_GROUPS: { label: string; colors: string[] }[] = [
  { label: "Reds & Pinks", colors: ["#ef4444", "#dc2626", "#f43f5e", "#ec4899", "#db2777", "#be185d"] },
  { label: "Oranges & Yellows", colors: ["#f97316", "#ea580c", "#f59e0b", "#d97706", "#eab308", "#facc15"] },
  { label: "Greens", colors: ["#84cc16", "#65a30d", "#22c55e", "#16a34a", "#10b981", "#059669"] },
  { label: "Blues & Teals", colors: ["#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#2563eb", "#1d4ed8"] },
  { label: "Purples", colors: ["#6366f1", "#7c3aed", "#8b5cf6", "#a855f7", "#c026d3", "#9333ea"] },
  { label: "Neutrals", colors: ["#78716c", "#57534e", "#64748b", "#475569", "#334155", "#1e293b"] },
];

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  { label: "Notes & Docs", emojis: ["📝", "📄", "📋", "📓", "📒", "📕", "📗", "📘", "📙", "📔", "📚", "🗒️", "🗂️", "📑", "🔖", "📜"] },
  { label: "Work & School", emojis: ["💼", "🎓", "🏫", "📊", "📈", "📉", "🗓️", "⏰", "📌", "📎", "✏️", "🖊️", "🧮", "🔬", "🧪", "⚗️"] },
  { label: "Ideas & Goals", emojis: ["💡", "🎯", "🚀", "⭐", "🌟", "✨", "🔥", "⚡", "🏆", "🥇", "🧠", "💭", "🗝️", "🧩", "🎲", "🔮"] },
  { label: "Life & Fun", emojis: ["❤️", "💛", "🏠", "🌱", "🌍", "☀️", "🌙", "🍕", "☕", "🎵", "🎨", "🎮", "✈️", "🏖️", "🛒", "🐾"] },
  { label: "Tech & Code", emojis: ["💻", "🖥️", "📱", "⌨️", "🖱️", "💾", "🔌", "🛠️", "⚙️", "🐛", "🤖", "🔗", "🌐", "🔒", "📡", "🧰"] },
];

const COVER_PRESETS = [
  { name: "Sunset Horizon", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80" },
  { name: "Northern Lights", url: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=1600&q=80" },
  { name: "Deep Space Nebula", url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1600&q=80" },
  { name: "Misty Pine Forest", url: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1600&q=80" },
  { name: "Cozy Coffee & Books", url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1600&q=80" },
  { name: "Minimal Abstract Art", url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1600&q=80" },
  { name: "Cyber City Lights", url: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1600&q=80" },
  { name: "Zen Japanese Garden", url: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1600&q=80" },
];

interface NoteVersion { id: string; noteId: string; title: string; content: string; createdAt: string; }
interface AttachmentMeta { id: string; noteId: string; filename: string; mimeType: string; size: number; createdAt: string; }

export function NoteEditor() {
  const {
    userEmail, currentNoteId, notes, updateNote, setCurrentNoteId, setNotes,
    setSaveStatus, saveStatus, addToast, soundEnabled, masterVolume,
    sidebarOpen, setSidebarOpen, setAiPanelOpen, aiPanelOpen, folders,
    setMobileView, noteInsertRequest, setNoteInsertRequest,
  } = useAppStore();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showMoveToFolder, setShowMoveToFolder] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [attachmentsList, setAttachmentsList] = useState<AttachmentMeta[]>([]);
  const [showExport, setShowExport] = useState(false);

  // Lightbox / Image Viewer state
  const [viewingImage, setViewingImage] = useState<{ url: string; filename?: string; size?: number; attachmentId?: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Upload destination prompt
  const [uploadOptionModal, setUploadOptionModal] = useState<{ files: File[] } | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  const vol = masterVolume / 100;
  const headers: Record<string, string> = { "x-user-email": userEmail || "", "Content-Type": "application/json" };

  const currentNote = notes.find((n) => n.id === currentNoteId);

  useEffect(() => {
    if (currentNote) {
      setTitle(currentNote.title);
      setContent(currentNote.content || "");
      setNoteTags(currentNote.tags || []);
      loadAttachments(currentNote.id);
    }
  }, [currentNoteId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadAttachments(noteId: string) {
    try { const res = await fetch(`/api/attachments?noteId=${noteId}`); if (res.ok) setAttachmentsList(await res.json()); } catch { /* */ }
  }

  // Apply text sent from AI panel
  useEffect(() => {
    if (!noteInsertRequest || !currentNoteId) return;
    const clean = noteInsertRequest.text.trim();
    const next = noteInsertRequest.mode === "replace" ? clean : (content ? `${content}\n\n${clean}` : clean);
    setContent(next);
    saveNote({ title, content: next });
    setNoteInsertRequest(null);
  }, [noteInsertRequest]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveNote = useCallback(async (updates: Partial<Note>) => {
    if (!currentNoteId) return;
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/notes/${currentNoteId}`, { method: "PATCH", headers, body: JSON.stringify(updates) });
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
  }, [currentNoteId, setSaveStatus, updateNote, soundEnabled, vol, addToast, userEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  function scheduleAutosave(newTitle: string, newContent: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveNote({ title: newTitle, content: newContent }), AUTOSAVE_DELAY);
  }

  function handleTitleChange(v: string) { setTitle(v); scheduleAutosave(v, content); }
  function handleContentChange(v: string) { setContent(v); scheduleAutosave(title, v); }

  async function toggleFavorite() { if (!currentNote) return; if (soundEnabled) playClick(vol); await saveNote({ isFavorite: !currentNote.isFavorite }); }
  async function togglePin() { if (!currentNote) return; if (soundEnabled) playClick(vol); await saveNote({ isPinned: !currentNote.isPinned }); }

  async function deleteNote() {
    if (!currentNote) return;
    if (soundEnabled) playDelete(vol);
    await saveNote({ isDeleted: true, deletedAt: new Date().toISOString() });
    setCurrentNoteId(null);
    addToast({ message: "Moved to trash", type: "info" });
  }

  async function setNoteColor(color: string | null) { if (soundEnabled) playClick(vol); await saveNote({ color }); setShowColorPicker(false); }
  async function setNoteIcon(icon: string) { if (soundEnabled) playClick(vol); await saveNote({ icon }); setShowIconPicker(false); }
  async function setNoteCover(coverImage: string | null) { if (soundEnabled) playClick(vol); await saveNote({ coverImage }); setShowCoverPicker(false); }

  async function addTag() {
    if (!tagInput.trim() || !currentNote) return;
    const newTags = [...noteTags, tagInput.trim()];
    setNoteTags(newTags); setTagInput("");
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
    addToast({ message: folderId ? "Moved to folder" : "Removed from folder", type: "success" });
  }

  async function loadVersions() {
    if (!currentNoteId) return;
    try { const res = await fetch(`/api/notes/${currentNoteId}/versions`); if (res.ok) setVersions(await res.json()); } catch { /* */ }
    setShowVersions(true);
  }

  async function restoreVersion(v: NoteVersion) {
    if (!confirm("Restore this version?")) return;
    setTitle(v.title); setContent(v.content);
    await saveNote({ title: v.title, content: v.content });
    setShowVersions(false);
    addToast({ message: "Version restored!", type: "success" });
  }

  // File upload logic
  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length || !currentNoteId) return;
    const fileList = Array.from(files);

    // If there's an image file, let user choose: attachment or background cover!
    const hasImage = fileList.some((f) => f.type.startsWith("image/"));
    if (hasImage && fileList.length === 1) {
      setUploadOptionModal({ files: fileList });
    } else {
      uploadFiles(fileList, false);
    }
    e.target.value = "";
  }

  async function uploadFiles(files: File[], setAsCover = false) {
    if (!currentNoteId) return;
    setUploadOptionModal(null);

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) { addToast({ message: `${file.name} too large (max 10MB)`, type: "error" }); continue; }
      const formData = new FormData();
      formData.append("file", file);
      formData.append("noteId", currentNoteId);
      try {
        const res = await fetch("/api/attachments", { method: "POST", body: formData });
        if (res.ok) {
          const att = await res.json();
          setAttachmentsList((prev) => [...prev, att]);

          if (setAsCover && file.type.startsWith("image/")) {
            await setNoteCover(`/api/attachments/${att.id}`);
            addToast({ message: "Set as note background cover 🖼️", type: "success" });
          } else {
            addToast({ message: `${file.name} attached 📎`, type: "success" });
          }
        } else {
          addToast({ message: `Failed to upload ${file.name}`, type: "error" });
        }
      } catch {
        addToast({ message: `Failed to upload ${file.name}`, type: "error" });
      }
    }
  }

  async function handleCoverDirectUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length || !currentNoteId) return;
    const file = files[0];
    if (file.size > 10 * 1024 * 1024) { addToast({ message: "Image too large (max 10MB)", type: "error" }); return; }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("noteId", currentNoteId);
    try {
      const res = await fetch("/api/attachments", { method: "POST", body: formData });
      if (res.ok) {
        const att = await res.json();
        setAttachmentsList((prev) => [...prev, att]);
        await setNoteCover(`/api/attachments/${att.id}`);
        addToast({ message: "Background cover updated! 🖼️", type: "success" });
      }
    } catch {
      addToast({ message: "Failed to upload cover", type: "error" });
    }
    e.target.value = "";
  }

  async function deleteAttachment(id: string) {
    try {
      await fetch(`/api/attachments/${id}`, { method: "DELETE" });
      setAttachmentsList((prev) => prev.filter((a) => a.id !== id));
      // If current cover is using this attachment, remove cover
      if (currentNote?.coverImage === `/api/attachments/${id}`) {
        await setNoteCover(null);
      }
      addToast({ message: "Attachment removed", type: "success" });
    } catch { addToast({ message: "Couldn't remove attachment", type: "error" }); }
  }

  function exportNote(fmt: string) {
    if (!currentNote) return;
    const blob = fmt === "md" ? new Blob([`# ${title}\n\n${content}`], { type: "text/markdown" }) : new Blob([`${title}\n\n${content.replace(/[#*\-\[\]>]/g, "")}`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${title || "note"}.${fmt === "md" ? "md" : "txt"}`; a.click();
    URL.revokeObjectURL(url); setShowExport(false);
    addToast({ message: `Exported as .${fmt}`, type: "success" });
  }

  function insertFormat(before: string, after = "") {
    const ta = contentRef.current; if (!ta) return;
    const start = ta.selectionStart; const end = ta.selectionEnd;
    const selected = content.substring(start, end);
    const newContent = content.substring(0, start) + before + selected + after + content.substring(end);
    setContent(newContent); scheduleAutosave(title, newContent);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + before.length, start + before.length + selected.length); }, 10);
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function openImageViewer(url: string, filename?: string, size?: number, attachmentId?: string) {
    setViewingImage({ url, filename, size, attachmentId });
    setZoomLevel(1);
  }

  if (!currentNote) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[rgb(var(--accent))]/20 to-purple-200/30 dark:to-purple-900/20 flex items-center justify-center mb-6 animate-float">
          <span className="text-5xl">✦</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">Welcome to Nexus</h2>
        <p className="text-[rgb(var(--text-secondary))] mb-8 max-w-sm leading-relaxed">
          Your thoughts, ideas, and plans — all in one beautiful place. Pick a note from the sidebar or start fresh.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button onClick={() => { setSidebarOpen(true); setMobileView("sidebar"); }} className="px-5 py-3 bg-gradient-to-r from-[rgb(var(--accent))] to-purple-500 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-md shadow-purple-200/50 dark:shadow-purple-900/30">
            📋 Browse Notes
          </button>
          <button onClick={() => { setAiPanelOpen(true); setMobileView("ai"); }} className="px-5 py-3 border-2 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 rounded-xl text-sm font-semibold hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all">
            🤖 Chat with AI
          </button>
        </div>
        <div className="mt-10 flex items-center gap-6 text-xs text-[rgb(var(--text-secondary))]/60">
          <span>⌘K Command Palette</span>
          <span>⌘B Sidebar</span>
          <span>⌘\ AI Panel</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 md:px-4 py-2 border-b border-[rgb(var(--border))] bg-[rgb(var(--sidebar-bg))] z-20">
        <div className="flex items-center gap-0.5">
          <button onClick={() => { setSidebarOpen(!sidebarOpen); setMobileView("sidebar"); }} className="p-2 rounded-xl text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg))] transition-colors md:hidden">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          </button>
          <div className="hidden sm:flex items-center gap-0.5 border-r border-[rgb(var(--border))] pr-2 mr-1">
            <button onClick={() => insertFormat("**", "**")} className="p-1.5 rounded-lg text-xs font-bold hover:bg-[rgb(var(--bg))] transition-colors" title="Bold">B</button>
            <button onClick={() => insertFormat("*", "*")} className="p-1.5 rounded-lg text-xs italic hover:bg-[rgb(var(--bg))] transition-colors" title="Italic">I</button>
            <button onClick={() => insertFormat("## ")} className="p-1.5 rounded-lg text-xs font-bold hover:bg-[rgb(var(--bg))] transition-colors" title="Heading">H</button>
            <button onClick={() => insertFormat("- ")} className="p-1.5 rounded-lg text-xs hover:bg-[rgb(var(--bg))] transition-colors" title="List">•</button>
            <button onClick={() => insertFormat("- [ ] ")} className="p-1.5 rounded-lg text-xs hover:bg-[rgb(var(--bg))] transition-colors" title="Checklist">☐</button>
            <button onClick={() => insertFormat("> ")} className="p-1.5 rounded-lg text-xs hover:bg-[rgb(var(--bg))] transition-colors" title="Quote">❝</button>
            <button onClick={() => insertFormat("```\n", "\n```")} className="p-1.5 rounded-lg text-xs hover:bg-[rgb(var(--bg))] transition-colors font-mono" title="Code">&lt;/&gt;</button>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <span className="text-xs text-[rgb(var(--text-secondary))] mr-2 hidden sm:inline">
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "saved" && "✓ Saved"}
            {saveStatus === "error" && <span className="text-red-500 cursor-pointer" onClick={() => saveNote({ title, content })}>⚠ Retry</span>}
          </span>

          {/* Cover / Background Banner Button */}
          <div className="relative">
            <button
              onClick={() => setShowCoverPicker(!showCoverPicker)}
              className={`p-1.5 rounded-xl transition-colors ${currentNote.coverImage ? "text-[rgb(var(--accent))] bg-[rgb(var(--accent))]/10" : "text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg))]"}`}
              title="Add / Change Background Cover"
            >
              🖼️
            </button>

            {showCoverPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowCoverPicker(false)} />
                <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-auto sm:top-full bottom-3 sm:bottom-auto sm:mt-2 sm:w-96 p-4 bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))] rounded-2xl shadow-2xl z-50 animate-fade-in max-h-[75vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold">Note Cover & Background</h3>
                    <button onClick={() => setShowCoverPicker(false)} className="p-1 rounded-lg hover:bg-[rgb(var(--bg))] text-[rgb(var(--text-secondary))]">✕</button>
                  </div>

                  {currentNote.coverImage && (
                    <button
                      onClick={() => setNoteCover(null)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 mb-3 rounded-xl border border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-semibold transition-colors"
                    >
                      🗑️ Remove Current Cover
                    </button>
                  )}

                  {/* Upload Custom Cover */}
                  <label className="w-full flex items-center justify-center gap-2 px-4 py-3 mb-4 rounded-xl border-2 border-dashed border-[rgb(var(--accent))]/40 bg-[rgb(var(--accent))]/5 hover:bg-[rgb(var(--accent))]/10 cursor-pointer text-sm font-semibold text-[rgb(var(--accent))] transition-all">
                    <span>📤</span> Upload Your Own Image
                    <input ref={coverFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverDirectUpload} />
                  </label>

                  {/* Existing uploaded images in this note */}
                  {attachmentsList.filter((a) => a.mimeType.startsWith("image/")).length > 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] font-semibold text-[rgb(var(--text-secondary))] uppercase tracking-wider mb-2">From Attachments</p>
                      <div className="grid grid-cols-3 gap-2">
                        {attachmentsList.filter((a) => a.mimeType.startsWith("image/")).map((att) => (
                          <button
                            key={att.id}
                            onClick={() => setNoteCover(`/api/attachments/${att.id}`)}
                            className={`group relative rounded-lg overflow-hidden border aspect-video hover:opacity-90 transition-all ${currentNote.coverImage === `/api/attachments/${att.id}` ? "ring-2 ring-[rgb(var(--accent))]" : "border-[rgb(var(--border))]"}`}
                          >
                            <img src={`/api/attachments/${att.id}`} alt={att.filename} className="w-full h-full object-cover" />
                            <span className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[10px] text-white font-semibold">Use Cover</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cover Presets */}
                  <div>
                    <p className="text-[10px] font-semibold text-[rgb(var(--text-secondary))] uppercase tracking-wider mb-2">Curated Backgrounds</p>
                    <div className="grid grid-cols-2 gap-2">
                      {COVER_PRESETS.map((p) => (
                        <button
                          key={p.name}
                          onClick={() => setNoteCover(p.url)}
                          className={`group relative rounded-xl overflow-hidden aspect-video border transition-transform hover:scale-[1.02] ${currentNote.coverImage === p.url ? "ring-2 ring-[rgb(var(--accent))] ring-offset-2" : "border-[rgb(var(--border))]"}`}
                        >
                          <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-2 flex items-end">
                            <span className="text-[11px] font-medium text-white truncate">{p.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <button onClick={toggleFavorite} className={`p-1.5 rounded-xl transition-colors ${currentNote.isFavorite ? "text-yellow-500" : "text-[rgb(var(--text-secondary))]"} hover:bg-[rgb(var(--bg))]`}>{currentNote.isFavorite ? "💛" : "🤍"}</button>
          <button onClick={togglePin} className={`p-1.5 rounded-xl transition-colors ${currentNote.isPinned ? "text-[rgb(var(--accent))]" : "text-[rgb(var(--text-secondary))]"} hover:bg-[rgb(var(--bg))]`}>📌</button>

          {/* Color Picker */}
          <div className="relative">
            <button onClick={() => setShowColorPicker(!showColorPicker)} className="p-1.5 rounded-xl text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg))] transition-colors">
              <div className="w-4 h-4 rounded-full border-2" style={currentNote.color ? { backgroundColor: currentNote.color, borderColor: currentNote.color } : { borderColor: "rgb(var(--border))" }} />
            </button>
            {showColorPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(false)} />
                <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-auto sm:top-full bottom-3 sm:bottom-auto sm:mt-2 sm:w-80 p-4 bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))] rounded-2xl shadow-2xl z-50 animate-fade-in max-h-[70vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold">Note Color</h3>
                    <button onClick={() => setShowColorPicker(false)} className="p-1 rounded-lg hover:bg-[rgb(var(--bg))] text-[rgb(var(--text-secondary))]">✕</button>
                  </div>

                  <button onClick={() => setNoteColor(null)} className={`w-full flex items-center gap-2.5 px-3 py-2.5 mb-3 rounded-xl border transition-colors ${!currentNote.color ? "border-[rgb(var(--accent))] bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))] font-semibold" : "border-[rgb(var(--border))] hover:bg-[rgb(var(--bg))]"}`}>
                    <span className="w-6 h-6 rounded-full border-2 border-dashed border-current flex items-center justify-center text-[10px]">✕</span>
                    <span className="text-sm">No color</span>
                  </button>

                  {COLOR_GROUPS.map((group) => (
                    <div key={group.label} className="mb-3 last:mb-0">
                      <p className="text-[10px] font-semibold text-[rgb(var(--text-secondary))] uppercase tracking-wider mb-2">{group.label}</p>
                      <div className="grid grid-cols-6 gap-2.5">
                        {group.colors.map((c) => (
                          <button
                            key={c}
                            onClick={() => setNoteColor(c)}
                            aria-label={`Color ${c}`}
                            className={`w-9 h-9 rounded-full transition-transform hover:scale-110 active:scale-95 flex items-center justify-center ${currentNote.color === c ? "ring-2 ring-offset-2 ring-[rgb(var(--accent))] ring-offset-[rgb(var(--card-bg))]" : ""}`}
                            style={{ backgroundColor: c }}
                          >
                            {currentNote.color === c && <span className="text-white text-xs font-bold">✓</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="mt-3 pt-3 border-t border-[rgb(var(--border))]">
                    <p className="text-[10px] font-semibold text-[rgb(var(--text-secondary))] uppercase tracking-wider mb-2">Custom color</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={currentNote.color || "#6366f1"}
                        onChange={(e) => setNoteColor(e.target.value)}
                        className="w-12 h-10 rounded-lg border border-[rgb(var(--border))] bg-transparent cursor-pointer"
                      />
                      <span className="text-xs text-[rgb(var(--text-secondary))]">Pick any color you like</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Emoji Picker */}
          <div className="relative">
            <button onClick={() => setShowIconPicker(!showIconPicker)} className="p-1.5 rounded-xl hover:bg-[rgb(var(--bg))] transition-colors">{currentNote.icon}</button>
            {showIconPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowIconPicker(false)} />
                <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-auto sm:top-full bottom-3 sm:bottom-auto sm:mt-2 sm:w-80 p-4 bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))] rounded-2xl shadow-2xl z-50 animate-fade-in max-h-[70vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold">Note Icon</h3>
                    <button onClick={() => setShowIconPicker(false)} className="p-1 rounded-lg hover:bg-[rgb(var(--bg))] text-[rgb(var(--text-secondary))]">✕</button>
                  </div>
                  {EMOJI_GROUPS.map((group) => (
                    <div key={group.label} className="mb-3 last:mb-0">
                      <p className="text-[10px] font-semibold text-[rgb(var(--text-secondary))] uppercase tracking-wider mb-2">{group.label}</p>
                      <div className="grid grid-cols-8 gap-1.5">
                        {group.emojis.map((e) => (
                          <button
                            key={e}
                            onClick={() => setNoteIcon(e)}
                            className={`w-9 h-9 rounded-xl transition-all hover:scale-110 active:scale-95 text-xl flex items-center justify-center ${currentNote.icon === e ? "bg-[rgb(var(--accent))]/15 ring-2 ring-[rgb(var(--accent))]" : "hover:bg-[rgb(var(--bg))]"}`}
                          >{e}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Move to Folder */}
          <div className="relative">
            <button onClick={() => setShowMoveToFolder(!showMoveToFolder)} className="p-1.5 rounded-xl text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg))] transition-colors">📁</button>
            {showMoveToFolder && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))] rounded-xl shadow-xl z-50 animate-fade-in overflow-hidden">
                <button onClick={() => moveToFolder(null)} className="w-full px-3 py-2.5 text-sm text-left hover:bg-[rgb(var(--bg))] transition-colors">📋 No Folder</button>
                {folders.map((f) => (<button key={f.id} onClick={() => moveToFolder(f.id)} className={`w-full px-3 py-2.5 text-sm text-left hover:bg-[rgb(var(--bg))] transition-colors ${currentNote.folderId === f.id ? "text-[rgb(var(--accent))] font-semibold" : ""}`}>{f.icon} {f.name}</button>))}
              </div>
            )}
          </div>

          {/* Upload attachment button */}
          <label className="p-1.5 rounded-xl text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg))] transition-colors cursor-pointer" title="Attach file or image">
            📎
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileInputChange} />
          </label>

          {/* Export */}
          <div className="relative">
            <button onClick={() => setShowExport(!showExport)} className="p-1.5 rounded-xl text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg))] transition-colors">⬇️</button>
            {showExport && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))] rounded-xl shadow-xl z-50 animate-fade-in overflow-hidden">
                <button onClick={() => exportNote("txt")} className="w-full px-3 py-2.5 text-sm text-left hover:bg-[rgb(var(--bg))]">📄 Plain Text</button>
                <button onClick={() => exportNote("md")} className="w-full px-3 py-2.5 text-sm text-left hover:bg-[rgb(var(--bg))]">📝 Markdown</button>
              </div>
            )}
          </div>

          <button onClick={loadVersions} className="p-1.5 rounded-xl text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg))] transition-colors" title="Version History">🕐</button>
          <button onClick={deleteNote} className="p-1.5 rounded-xl text-[rgb(var(--text-secondary))] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Move to Trash">🗑️</button>
          <button onClick={() => setAiPanelOpen(!aiPanelOpen)} className={`p-1.5 rounded-xl transition-colors ${aiPanelOpen ? "text-purple-500 bg-purple-50 dark:bg-purple-900/20" : "text-[rgb(var(--text-secondary))] hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20"}`} title="AI Assistant">🤖</button>
        </div>
      </div>

      {/* Editor Main Area (with scroll) */}
      <div className="flex-1 overflow-y-auto relative">
        {/* Cover / Background Banner Header */}
        {currentNote.coverImage && (
          <div className="relative w-full h-48 md:h-64 overflow-hidden group bg-stone-900">
            <img
              src={currentNote.coverImage}
              alt="Note cover background"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 cursor-pointer"
              onClick={() => openImageViewer(currentNote.coverImage!)}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-[rgb(var(--bg))]" />

            {/* Cover Action Overlays */}
            <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => openImageViewer(currentNote.coverImage!)}
                className="px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 text-white text-xs font-semibold backdrop-blur-md transition-colors"
              >
                🔍 Full View
              </button>
              <button
                onClick={() => setShowCoverPicker(true)}
                className="px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 text-white text-xs font-semibold backdrop-blur-md transition-colors"
              >
                🖼️ Change Cover
              </button>
              <button
                onClick={() => setNoteCover(null)}
                className="p-1.5 rounded-xl bg-black/60 hover:bg-red-600 text-white text-xs font-semibold backdrop-blur-md transition-colors"
                title="Remove Cover"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Content Container */}
        <div className={`p-5 md:p-10 max-w-3xl mx-auto w-full relative ${currentNote.coverImage ? "-mt-8" : ""}`}>
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => setShowIconPicker(!showIconPicker)} className="text-3xl hover:scale-110 transition-transform">{currentNote.icon}</button>
            <input value={title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Give it a name..." className="flex-1 text-2xl md:text-3xl font-bold bg-transparent focus:outline-none placeholder:text-[rgb(var(--text-secondary))]/30" />
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-3 text-xs text-[rgb(var(--text-secondary))]">
            <span>{format(new Date(currentNote.createdAt), "MMM d, yyyy")}</span>
            <span>·</span>
            <span>Edited {formatDistanceToNow(new Date(currentNote.updatedAt), { addSuffix: true })}</span>
            {currentNote.folderId && (<><span>·</span><span>{folders.find((f) => f.id === currentNote.folderId)?.icon} {folders.find((f) => f.id === currentNote.folderId)?.name}</span></>)}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mb-6">
            {noteTags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))] rounded-full font-medium">
                #{tag}<button onClick={() => removeTag(tag)} className="hover:text-red-500 ml-0.5">×</button>
              </span>
            ))}
            <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()} placeholder="+ tag" className="w-16 px-2 py-1 text-xs bg-transparent focus:outline-none focus:w-28 transition-all placeholder:text-[rgb(var(--text-secondary))]/40" />
          </div>

          <textarea
            ref={contentRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Start writing your thoughts..."
            className="w-full min-h-[400px] bg-transparent resize-none focus:outline-none text-base leading-[1.8] placeholder:text-[rgb(var(--text-secondary))]/30"
          />

          {/* Attachments Section */}
          {attachmentsList.length > 0 && (
            <div className="mt-8 border-t border-[rgb(var(--border))] pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[rgb(var(--text-secondary))] uppercase tracking-wider flex items-center gap-1.5">
                  <span>📎</span> Attachments ({attachmentsList.length})
                </h3>
              </div>

              {/* Images Grid */}
              {attachmentsList.filter((a) => a.mimeType.startsWith("image/")).length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-[rgb(var(--text-secondary))] mb-2">Photos & Images (tap to view full-size)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {attachmentsList.filter((a) => a.mimeType.startsWith("image/")).map((att) => (
                      <div
                        key={att.id}
                        className="group relative rounded-2xl overflow-hidden border border-[rgb(var(--border))] bg-[rgb(var(--card-bg))] shadow-sm transition-all hover:shadow-md aspect-video cursor-pointer"
                        onClick={() => openImageViewer(`/api/attachments/${att.id}`, att.filename, att.size, att.id)}
                      >
                        <img src={`/api/attachments/${att.id}`} alt={att.filename} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />

                        {/* Overlay with info & actions */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-2.5 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); setNoteCover(`/api/attachments/${att.id}`); }}
                              className="px-2 py-1 rounded-lg bg-white/20 hover:bg-white text-white hover:text-black text-[10px] font-semibold backdrop-blur-sm transition-colors"
                              title="Set as Note Background Cover"
                            >
                              🖼️ Cover
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteAttachment(att.id); }}
                              className="p-1 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-[10px] transition-colors"
                              title="Delete Image"
                            >
                              ✕
                            </button>
                          </div>
                          <div>
                            <p className="text-white text-xs font-semibold truncate">{att.filename}</p>
                            <p className="text-white/70 text-[10px]">{formatSize(att.size)} · Click to view</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other Files List (PDF, Audio, Video, Docs) */}
              {attachmentsList.filter((a) => !a.mimeType.startsWith("image/")).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[rgb(var(--text-secondary))] mb-2">Files & Documents</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {attachmentsList.filter((a) => !a.mimeType.startsWith("image/")).map((att) => (
                      <div key={att.id} className="flex items-center gap-3 p-3 bg-[rgb(var(--bg))] rounded-xl border border-[rgb(var(--border))]">
                        <div className="w-10 h-10 flex items-center justify-center bg-[rgb(var(--accent))]/10 rounded-xl text-lg flex-shrink-0">
                          {att.mimeType.startsWith("audio/") ? "🎵" : att.mimeType.startsWith("video/") ? "🎬" : "📄"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <a href={`/api/attachments/${att.id}`} target="_blank" rel="noreferrer" className="text-xs font-semibold truncate block hover:text-[rgb(var(--accent))]">
                            {att.filename}
                          </a>
                          <span className="text-[10px] text-[rgb(var(--text-secondary))]">{formatSize(att.size)}</span>
                        </div>
                        <button onClick={() => deleteAttachment(att.id)} className="p-1.5 rounded-lg text-[rgb(var(--text-secondary))] hover:text-red-500 transition-colors">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Media Players */}
          {attachmentsList.filter((a) => a.mimeType.startsWith("audio/")).map((a) => (<audio key={a.id} controls className="w-full mt-4" src={`/api/attachments/${a.id}`} />))}
          {attachmentsList.filter((a) => a.mimeType.startsWith("video/")).map((a) => (<video key={a.id} controls className="w-full rounded-2xl mt-4 border border-[rgb(var(--border))]" src={`/api/attachments/${a.id}`} />))}
        </div>
      </div>

      {/* Upload Destination Choice Modal */}
      {uploadOptionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setUploadOptionModal(null)}>
          <div className="bg-[rgb(var(--card-bg))] rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-2xl bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))] text-3xl flex items-center justify-center mx-auto mb-4">
              🖼️
            </div>
            <h3 className="text-lg font-bold mb-1">How would you like to use this image?</h3>
            <p className="text-xs text-[rgb(var(--text-secondary))] mb-6 truncate px-2">{uploadOptionModal.files[0]?.name}</p>

            <div className="space-y-2.5">
              <button
                onClick={() => uploadFiles(uploadOptionModal.files, true)}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[rgb(var(--accent))] to-purple-500 text-white rounded-2xl text-sm font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md shadow-purple-200/40"
              >
                <span>🖼️</span> Set as Note Background Cover
              </button>

              <button
                onClick={() => uploadFiles(uploadOptionModal.files, false)}
                className="w-full py-3.5 px-4 border border-[rgb(var(--border))] rounded-2xl text-sm font-semibold hover:bg-[rgb(var(--bg))] transition-colors flex items-center justify-center gap-2"
              >
                <span>📎</span> Just Attach to Note
              </button>

              <button
                onClick={() => setUploadOptionModal(null)}
                className="w-full py-2 text-xs text-[rgb(var(--text-secondary))] hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL LIGHTBOX / IMAGE VIEWER MODAL */}
      {viewingImage && (
        <div
          className="fixed inset-0 bg-black/90 z-[80] flex flex-col items-center justify-between p-4 sm:p-6 animate-fade-in backdrop-blur-md"
          onClick={() => setViewingImage(null)}
        >
          {/* Top Bar */}
          <div className="w-full max-w-4xl flex items-center justify-between text-white z-10" onClick={(e) => e.stopPropagation()}>
            <div className="min-w-0 pr-4">
              <h3 className="font-semibold text-sm truncate">{viewingImage.filename || "Image Preview"}</h3>
              {viewingImage.size && <p className="text-white/60 text-xs">{formatSize(viewingImage.size)}</p>}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm"
                title="Zoom Out"
              >
                ➖
              </button>
              <span className="text-xs text-white/80 font-mono w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm"
                title="Zoom In"
              >
                ➕
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs"
                title="Reset Zoom"
              >
                Reset
              </button>
              <a
                href={viewingImage.url}
                download={viewingImage.filename || "image"}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-1"
                title="Download full size"
              >
                ⬇️ Download
              </a>
              <button
                onClick={() => setViewingImage(null)}
                className="p-2 rounded-xl bg-white/20 hover:bg-red-500 text-white font-bold text-sm ml-2 transition-colors"
                title="Close Viewer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Center Image Container */}
          <div className="flex-1 flex items-center justify-center w-full max-h-[78vh] overflow-hidden my-auto" onClick={(e) => e.stopPropagation()}>
            <img
              src={viewingImage.url}
              alt={viewingImage.filename || "Full view"}
              style={{ transform: `scale(${zoomLevel})`, transition: "transform 0.2s ease-out" }}
              className="max-h-[75vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl select-none"
            />
          </div>

          {/* Bottom Action Bar */}
          <div className="flex items-center gap-3 z-10" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setNoteCover(viewingImage.url);
                setViewingImage(null);
                addToast({ message: "Set as note background cover 🖼️", type: "success" });
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-[rgb(var(--accent))] to-purple-500 text-white rounded-xl text-xs font-semibold hover:opacity-90 shadow-lg flex items-center gap-2"
            >
              <span>🖼️</span> Use as Note Background Cover
            </button>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showVersions && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowVersions(false)}>
          <div className="bg-[rgb(var(--card-bg))] rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[rgb(var(--border))]"><h2 className="font-bold text-lg">🕐 Version History</h2><button onClick={() => setShowVersions(false)} className="p-1.5 rounded-lg hover:bg-[rgb(var(--bg))]">✕</button></div>
            <div className="overflow-y-auto max-h-96">
              {versions.length === 0 ? (
                <div className="p-10 text-center text-[rgb(var(--text-secondary))]"><p className="text-4xl mb-3">🕐</p><p className="text-sm">No previous versions yet</p></div>
              ) : versions.map((v) => (
                <div key={v.id} className="p-4 border-b border-[rgb(var(--border))] hover:bg-[rgb(var(--bg))] transition-colors">
                  <div className="flex justify-between items-start mb-1"><span className="font-semibold text-sm">{v.title}</span><span className="text-xs text-[rgb(var(--text-secondary))]">{format(new Date(v.createdAt), "MMM d, h:mm a")}</span></div>
                  <p className="text-xs text-[rgb(var(--text-secondary))] mb-2 truncate">{v.content?.substring(0, 100)}</p>
                  <button onClick={() => restoreVersion(v)} className="text-xs text-[rgb(var(--accent))] hover:underline font-medium">Restore this version →</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
