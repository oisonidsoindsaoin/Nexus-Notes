"use client";

import { useState } from "react";
import { useAppStore, type Theme } from "@/lib/store";
import { playClick, playSave, playNotification, playAiComplete, playType, playToggle } from "@/lib/sounds";
import { saveSetting, applyPresetVars, clearPresetVars, type ThemePreset } from "@/lib/settings";
import { MarkdownView } from "@/lib/markdown";

const MARKDOWN_EXAMPLES: { label: string; src: string }[] = [
  { label: "Bold", src: "**Important idea**" },
  { label: "Italic", src: "*A softer note*" },
  { label: "Underline", src: "++Underlined++" },
  { label: "Strikethrough", src: "~~Done with this~~" },
  { label: "Highlight", src: "==Remember this==" },
  { label: "Heading", src: "## My Heading" },
  { label: "Bullet list", src: "- Milk\n- Eggs" },
  { label: "Numbered list", src: "1. Wake up\n2. Study" },
  { label: "Checklist", src: "- [x] Finish website\n- [ ] Study" },
  { label: "Quote", src: "> Keep it simple." },
  { label: "Inline code", src: "Run `npm start`" },
  { label: "Code block", src: "```js\nconst a = 1;\n```" },
  { label: "Link", src: "[Open Google](https://google.com)" },
  { label: "Divider", src: "---" },
];

const THEME_PRESETS: ThemePreset[] = [
  { name: "Midnight", accent: "129 140 248", bg: "15 23 42", sidebar: "30 41 59", card: "30 41 59", text: "248 250 252", border: "51 65 85" },
  { name: "Ocean", accent: "56 189 248", bg: "8 25 45", sidebar: "12 35 62", card: "12 35 62", text: "224 242 254", border: "30 64 110" },
  { name: "Aurora", accent: "52 211 153", bg: "10 26 26", sidebar: "16 38 38", card: "16 38 38", text: "209 250 229", border: "22 78 78" },
  { name: "Sunset", accent: "251 146 60", bg: "28 15 10", sidebar: "42 22 16", card: "42 22 16", text: "255 237 213", border: "124 45 18" },
  { name: "Forest", accent: "74 222 128", bg: "18 28 20", sidebar: "26 40 30", card: "26 40 30", text: "220 252 231", border: "34 70 44" },
  { name: "Lavender", accent: "168 85 247", bg: "248 245 255", sidebar: "255 255 255", card: "255 255 255", text: "55 32 100", border: "228 216 255" },
  { name: "Rose", accent: "244 63 94", bg: "255 245 247", sidebar: "255 255 255", card: "255 255 255", text: "76 16 34", border: "255 214 222" },
  { name: "Ice", accent: "14 165 233", bg: "240 249 255", sidebar: "255 255 255", card: "255 255 255", text: "12 74 110", border: "191 232 253" },
  { name: "Graphite", accent: "161 161 170", bg: "24 24 27", sidebar: "39 39 42", card: "39 39 42", text: "228 228 231", border: "63 63 70" },
  { name: "Cream", accent: "180 83 9", bg: "255 251 235", sidebar: "255 255 255", card: "255 255 255", text: "92 45 0", border: "253 226 175" },
  { name: "Cyber", accent: "34 255 170", bg: "10 12 22", sidebar: "16 20 34", card: "16 20 34", text: "205 255 231", border: "20 86 64" },
  { name: "Minimal", accent: "38 38 38", bg: "255 255 255", sidebar: "250 250 250", card: "255 255 255", text: "23 23 23", border: "229 229 229" },
];

const SETTINGS_SECTIONS = ["General", "Appearance", "Sounds", "Editor", "AI", "Shortcuts", "About"];

export function SettingsModal() {
  const {
    userEmail, setSettingsOpen, theme, setTheme, soundEnabled, setSoundEnabled,
    typingSoundsEnabled, setTypingSoundsEnabled, masterVolume, setMasterVolume,
    addToast, aiNoteContext, setAiNoteContext,
  } = useAppStore();

  const [activeSection, setActiveSection] = useState("General");
  const [searchSettings, setSearchSettings] = useState("");
  const vol = masterVolume / 100;

  async function applyPreset(preset: ThemePreset) {
    applyPresetVars(preset);
    if (soundEnabled) playToggle(vol);
    await saveSetting(userEmail, "themePreset", preset);
    addToast({ message: `${preset.name} theme saved`, type: "success" });
  }

  async function resetPreset() {
    clearPresetVars();
    await saveSetting(userEmail, "themePreset", null);
    addToast({ message: "Theme reset to default", type: "success" });
  }

  async function handleThemeChange(t: Theme) {
    setTheme(t);
    if (soundEnabled) playToggle(vol);
    await saveSetting(userEmail, "theme", t);
  }

  const filteredSections = searchSettings
    ? SETTINGS_SECTIONS.filter((s) => s.toLowerCase().includes(searchSettings.toLowerCase()))
    : SETTINGS_SECTIONS;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4" onClick={() => setSettingsOpen(false)}>
      <div
        className="bg-[rgb(var(--card-bg))] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-hidden animate-fade-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[rgb(var(--border))]">
          <h2 className="text-lg font-bold flex items-center gap-2"><span>⚙️</span> Settings</h2>
          <button onClick={() => setSettingsOpen(false)} className="p-2 rounded-xl hover:bg-[rgb(var(--bg))] transition-colors">✕</button>
        </div>

        {/* Mobile section picker */}
        <div className="sm:hidden p-2 border-b border-[rgb(var(--border))] overflow-x-auto flex gap-1.5 flex-shrink-0">
          {SETTINGS_SECTIONS.map((s) => (
            <button key={s} onClick={() => setActiveSection(s)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${activeSection === s ? "bg-[rgb(var(--accent))] text-white" : "bg-[rgb(var(--bg))] text-[rgb(var(--text-secondary))]"}`}
            >{s}</button>
          ))}
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-44 border-r border-[rgb(var(--border))] p-2 hidden sm:block overflow-y-auto">
            <input value={searchSettings} onChange={(e) => setSearchSettings(e.target.value)} placeholder="Search..." className="w-full px-2.5 py-1.5 text-xs bg-[rgb(var(--bg))] border border-[rgb(var(--border))] rounded-lg mb-2 focus:outline-none" />
            {filteredSections.map((s) => (
              <button key={s} onClick={() => setActiveSection(s)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors mb-0.5 ${activeSection === s ? "bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))] font-semibold" : "text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg))]"}`}
              >{s}</button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {activeSection === "General" && (
              <>
                <SectionTitle title="Theme Mode" />
                <div className="flex gap-2">
                  {(["light", "dark", "system"] as Theme[]).map((t) => (
                    <button key={t} onClick={() => handleThemeChange(t)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${theme === t ? "bg-[rgb(var(--accent))] text-white shadow-sm" : "bg-[rgb(var(--bg))] border border-[rgb(var(--border))] hover:border-[rgb(var(--accent))]/30"}`}
                    >{t === "light" ? "☀️ Light" : t === "dark" ? "🌙 Dark" : "💻 System"}</button>
                  ))}
                </div>
                <div className="bg-[rgb(var(--bg))] rounded-xl p-4">
                  <p className="text-sm font-semibold mb-1">Signed in as</p>
                  <p className="text-sm text-[rgb(var(--text-secondary))]">{userEmail}</p>
                  <p className="text-xs text-[rgb(var(--text-secondary))] mt-2">All settings save to your account automatically.</p>
                </div>
              </>
            )}

            {activeSection === "Appearance" && (
              <>
                <SectionTitle title="Theme Presets" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {THEME_PRESETS.map((p) => (
                    <button key={p.name} onClick={() => applyPreset(p)}
                      className="p-3 rounded-xl border border-[rgb(var(--border))] hover:border-[rgb(var(--accent))]/40 transition-all hover:shadow-md text-left"
                    >
                      <div className="flex gap-1 mb-2">
                        <div className="w-5 h-5 rounded-full" style={{ background: `rgb(${p.accent})` }} />
                        <div className="w-5 h-5 rounded-full border border-[rgb(var(--border))]" style={{ background: `rgb(${p.bg})` }} />
                        <div className="w-5 h-5 rounded-full border border-[rgb(var(--border))]" style={{ background: `rgb(${p.sidebar})` }} />
                      </div>
                      <span className="text-xs font-semibold">{p.name}</span>
                    </button>
                  ))}
                </div>
                <button onClick={resetPreset} className="w-full py-2.5 rounded-xl border border-[rgb(var(--border))] text-sm font-medium hover:bg-[rgb(var(--bg))] transition-colors">
                  Reset to default colors
                </button>
              </>
            )}

            {activeSection === "Sounds" && (
              <>
                <SectionTitle title="Sound & Feedback" />
                <ToggleSetting label="Sound Effects" description="Play sounds for interactions"
                  value={soundEnabled}
                  onChange={async (v) => { setSoundEnabled(v); if (v) playClick(vol); await saveSetting(userEmail, "soundEnabled", v); }}
                />
                <ToggleSetting label="Typing Sounds" description="Play a soft key sound while typing"
                  value={typingSoundsEnabled}
                  onChange={async (v) => { setTypingSoundsEnabled(v); if (v) playType(vol); await saveSetting(userEmail, "typingSoundsEnabled", v); }}
                />
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Master Volume</label>
                  <div className="flex items-center gap-3">
                    <span className="text-xs">🔈</span>
                    <input type="range" min="0" max="100" value={masterVolume}
                      onChange={(e) => setMasterVolume(Number(e.target.value))}
                      onPointerUp={async (e) => { const v = Number((e.target as HTMLInputElement).value); playClick(v / 100); await saveSetting(userEmail, "masterVolume", v); }}
                      className="flex-1 accent-[rgb(var(--accent))]"
                    />
                    <span className="text-xs text-[rgb(var(--text-secondary))] w-9 text-right">{masterVolume}%</span>
                  </div>
                </div>
                <SectionTitle title="Preview Sounds" />
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Click", fn: () => playClick(vol) },
                    { label: "Save", fn: () => playSave(vol) },
                    { label: "Notification", fn: () => playNotification(vol) },
                    { label: "AI Response", fn: () => playAiComplete(vol) },
                    { label: "Typing", fn: () => playType(vol) },
                    { label: "Toggle", fn: () => playToggle(vol) },
                  ].map(({ label, fn }) => (
                    <button key={label} onClick={fn} className="px-3 py-2.5 text-sm border border-[rgb(var(--border))] rounded-xl hover:bg-[rgb(var(--bg))] transition-colors text-left font-medium">🔊 {label}</button>
                  ))}
                </div>
              </>
            )}

            {activeSection === "Editor" && (
              <>
                <div className="bg-[rgb(var(--accent))]/10 border border-[rgb(var(--accent))]/25 rounded-xl p-3.5 text-xs leading-relaxed">
                  <p className="font-semibold text-[rgb(var(--accent))] mb-1">👁️ How formatting works</p>
                  <p className="text-[rgb(var(--text-secondary))]">
                    Type the syntax below while in <strong>Write</strong> mode, then tap the{" "}
                    <strong>👁️ Preview</strong> toggle at the top of your note to see it fully formatted.
                    Checkboxes are clickable in Preview and save instantly.
                  </p>
                </div>

                <SectionTitle title="Markdown Reference — Live" />
                <p className="text-xs text-[rgb(var(--text-secondary))] -mt-2">
                  Left is what you type · Right is the real rendered result.
                </p>

                <div className="rounded-xl border border-[rgb(var(--border))] overflow-hidden divide-y divide-[rgb(var(--border))]">
                  {MARKDOWN_EXAMPLES.map(({ label, src }) => (
                    <div key={label} className="grid grid-cols-2 gap-3 p-3 items-center">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-[rgb(var(--text-secondary))] uppercase tracking-wider mb-1">{label}</p>
                        <code className="block text-[11px] font-mono bg-[rgb(var(--bg))] border border-[rgb(var(--border))] rounded-lg px-2 py-1.5 whitespace-pre-wrap break-words">
                          {src}
                        </code>
                      </div>
                      <div className="min-w-0 text-sm [&_*:first-child]:mt-0 [&_*:last-child]:mb-0">
                        <MarkdownView content={src} />
                      </div>
                    </div>
                  ))}
                </div>

                <SectionTitle title="Editor Shortcuts" />
                <div className="bg-[rgb(var(--bg))] rounded-xl p-4 space-y-2.5 text-sm">
                  {[["Bold", "⌘ B"], ["Italic", "⌘ I"], ["Underline", "⌘ U"], ["Inline code", "⌘ E"], ["Highlight", "⌘ H"]].map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center">
                      <span>{k}</span>
                      <kbd className="px-2 py-1 bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))] rounded text-xs font-mono">{v}</kbd>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeSection === "AI" && (
              <>
                <SectionTitle title="AI Configuration" />
                <div className="bg-[rgb(var(--bg))] rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center"><span className="text-sm font-semibold">Provider</span><span className="text-sm text-[rgb(var(--text-secondary))]">Google Gemini</span></div>
                  <div className="flex justify-between items-center"><span className="text-sm font-semibold">Model</span><span className="text-sm text-[rgb(var(--text-secondary))]">gemini-3.6-flash</span></div>
                  <div className="flex justify-between items-center"><span className="text-sm font-semibold">API Key</span><span className="text-sm text-green-500">✓ Stored server-side</span></div>
                </div>
                <ToggleSetting label="Use Current Note as Context" description="Let the AI read the note you have open"
                  value={aiNoteContext}
                  onChange={async (v) => { setAiNoteContext(v); await saveSetting(userEmail, "aiNoteContext", v); }}
                />
                <div className="text-xs text-[rgb(var(--text-secondary))] bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-xl">
                  🔒 Your API key never reaches the browser. All AI calls go through a secure server route.
                </div>
              </>
            )}

            {activeSection === "Shortcuts" && (
              <>
                <SectionTitle title="Keyboard Shortcuts" />
                <div className="bg-[rgb(var(--bg))] rounded-xl p-4 space-y-3 text-sm">
                  {[["Command Palette", "⌘ K"], ["Toggle Sidebar", "⌘ B"], ["Toggle AI Panel", "⌘ \\"], ["Settings", "⌘ ,"], ["Close / Cancel", "Esc"]].map(([a, s]) => (
                    <div key={a} className="flex justify-between items-center"><span>{a}</span><kbd className="px-2 py-1 bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))] rounded text-xs font-mono">{s}</kbd></div>
                  ))}
                </div>
              </>
            )}

            {activeSection === "About" && (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">✦</div>
                <h3 className="text-xl font-bold mb-1">Nexus Notes</h3>
                <p className="text-sm text-[rgb(var(--text-secondary))] mb-4">Your AI-powered notebook</p>
                <p className="text-xs text-[rgb(var(--text-secondary))]">Version 1.2.0</p>
                <p className="text-xs text-[rgb(var(--text-secondary))] mt-1">Next.js · PostgreSQL · Gemini</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h3 className="text-xs font-bold text-[rgb(var(--text-secondary))] uppercase tracking-wider">{title}</h3>;
}

function ToggleSetting({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (v: boolean) => void; }) {
  return (
    <div className="flex items-center justify-between py-1.5 gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-[rgb(var(--text-secondary))]">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        aria-label={label}
        className={`w-12 h-7 rounded-full transition-colors relative flex-shrink-0 ${value ? "bg-[rgb(var(--accent))]" : "bg-[rgb(var(--border))]"}`}
      >
        <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-1 transition-transform ${value ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}
