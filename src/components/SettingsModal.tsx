"use client";

import { useState, useEffect } from "react";
import { useAppStore, type Theme } from "@/lib/store";
import { playClick, playSave, playNotification, playAiComplete, playType, playToggle } from "@/lib/sounds";

const THEME_PRESETS = [
  { name: "Midnight", accent: "99 102 241", bg: "15 23 42", sidebar: "30 41 59", card: "30 41 59", text: "248 250 252", border: "51 65 85" },
  { name: "Ocean", accent: "59 130 246", bg: "15 23 42", sidebar: "23 37 84", card: "23 37 84", text: "224 242 254", border: "37 99 235" },
  { name: "Aurora", accent: "34 197 94", bg: "15 23 42", sidebar: "20 30 30", card: "20 30 30", text: "220 252 231", border: "22 101 52" },
  { name: "Sunset", accent: "249 115 22", bg: "28 15 10", sidebar: "40 20 15", card: "40 20 15", text: "255 237 213", border: "124 45 18" },
  { name: "Forest", accent: "34 197 94", bg: "20 30 20", sidebar: "28 40 28", card: "28 40 28", text: "220 252 231", border: "22 78 22" },
  { name: "Lavender", accent: "168 85 247", bg: "245 243 255", sidebar: "255 255 255", card: "255 255 255", text: "55 32 100", border: "216 200 255" },
  { name: "Rose", accent: "244 63 94", bg: "255 245 247", sidebar: "255 255 255", card: "255 255 255", text: "76 16 34", border: "255 205 215" },
  { name: "Ice", accent: "56 189 248", bg: "240 249 255", sidebar: "255 255 255", card: "255 255 255", text: "12 74 110", border: "186 230 253" },
  { name: "Graphite", accent: "148 163 184", bg: "30 30 30", sidebar: "40 40 40", card: "40 40 40", text: "226 232 240", border: "64 64 64" },
  { name: "Cream", accent: "180 83 9", bg: "255 251 235", sidebar: "255 255 255", card: "255 255 255", text: "92 45 0", border: "253 224 171" },
  { name: "Cyber", accent: "0 255 136", bg: "10 10 20", sidebar: "15 15 30", card: "15 15 30", text: "200 255 220", border: "0 80 50" },
  { name: "Minimal", accent: "0 0 0", bg: "255 255 255", sidebar: "250 250 250", card: "255 255 255", text: "0 0 0", border: "229 229 229" },
];

const SETTINGS_SECTIONS = ["General", "Appearance", "Sounds", "Editor", "AI", "Shortcuts", "About"];

export function SettingsModal() {
  const {
    setSettingsOpen, theme, setTheme, soundEnabled, setSoundEnabled,
    typingSoundsEnabled, setTypingSoundsEnabled, masterVolume, setMasterVolume,
    addToast, aiNoteContext, setAiNoteContext,
  } = useAppStore();

  const [activeSection, setActiveSection] = useState("General");
  const [searchSettings, setSearchSettings] = useState("");
  const vol = masterVolume / 100;

  function applyPreset(preset: typeof THEME_PRESETS[0]) {
    const root = document.documentElement;
    root.style.setProperty("--accent", preset.accent);
    root.style.setProperty("--bg", preset.bg);
    root.style.setProperty("--sidebar-bg", preset.sidebar);
    root.style.setProperty("--card-bg", preset.card);
    root.style.setProperty("--text", preset.text);
    root.style.setProperty("--border", preset.border);
    addToast({ message: `${preset.name} theme applied`, type: "success" });

    // Persist
    fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "themePreset", value: preset }),
    });
  }

  function handleThemeChange(t: Theme) {
    setTheme(t);
    if (soundEnabled) playToggle(vol);
    fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "theme", value: t }),
    });
  }

  // Load saved settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const settings = await res.json();
          if (settings.theme) setTheme(settings.theme as Theme);
          if (settings.themePreset) {
            const preset = settings.themePreset as typeof THEME_PRESETS[0];
            const root = document.documentElement;
            root.style.setProperty("--accent", preset.accent);
            root.style.setProperty("--bg", preset.bg);
            root.style.setProperty("--sidebar-bg", preset.sidebar);
            root.style.setProperty("--card-bg", preset.card);
            root.style.setProperty("--text", preset.text);
            root.style.setProperty("--border", preset.border);
          }
          if (settings.soundEnabled !== undefined) setSoundEnabled(settings.soundEnabled as boolean);
          if (settings.masterVolume !== undefined) setMasterVolume(settings.masterVolume as number);
        }
      } catch { /* ignore */ }
    }
    loadSettings();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function saveSetting(key: string, value: unknown) {
    fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
  }

  const filteredSections = searchSettings
    ? SETTINGS_SECTIONS.filter((s) => s.toLowerCase().includes(searchSettings.toLowerCase()))
    : SETTINGS_SECTIONS;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSettingsOpen(false)}>
      <div
        className="bg-[rgb(var(--card-bg))] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden animate-fade-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[rgb(var(--border))]">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span>⚙️</span> Settings
          </h2>
          <button onClick={() => setSettingsOpen(false)} className="p-2 rounded-lg hover:bg-[rgb(var(--bg))] transition-colors">
            ✕
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Settings nav */}
          <div className="w-44 border-r border-[rgb(var(--border))] p-2 hidden sm:block overflow-y-auto">
            <input
              value={searchSettings}
              onChange={(e) => setSearchSettings(e.target.value)}
              placeholder="Search..."
              className="w-full px-2 py-1.5 text-xs bg-[rgb(var(--bg))] border border-[rgb(var(--border))] rounded-lg mb-2 focus:outline-none"
            />
            {filteredSections.map((s) => (
              <button
                key={s}
                onClick={() => setActiveSection(s)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                  activeSection === s
                    ? "bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))] font-medium"
                    : "text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg))]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Mobile section picker */}
          <div className="sm:hidden p-2 border-b border-[rgb(var(--border))] overflow-x-auto flex gap-1 flex-shrink-0">
            {SETTINGS_SECTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setActiveSection(s)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs ${
                  activeSection === s ? "bg-[rgb(var(--accent))] text-white" : "bg-[rgb(var(--bg))] text-[rgb(var(--text-secondary))]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {activeSection === "General" && (
              <>
                <SectionTitle title="Theme Mode" />
                <div className="flex gap-2">
                  {(["light", "dark", "system"] as Theme[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => handleThemeChange(t)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        theme === t
                          ? "bg-[rgb(var(--accent))] text-white shadow-sm"
                          : "bg-[rgb(var(--bg))] border border-[rgb(var(--border))] hover:border-[rgb(var(--accent))]/30"
                      }`}
                    >
                      {t === "light" ? "☀️ Light" : t === "dark" ? "🌙 Dark" : "💻 System"}
                    </button>
                  ))}
                </div>
              </>
            )}

            {activeSection === "Appearance" && (
              <>
                <SectionTitle title="Theme Presets" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {THEME_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => applyPreset(p)}
                      className="p-3 rounded-xl border border-[rgb(var(--border))] hover:border-[rgb(var(--accent))]/30 transition-all hover:shadow-md text-left"
                    >
                      <div className="flex gap-1 mb-2">
                        <div className="w-4 h-4 rounded-full" style={{ background: `rgb(${p.accent})` }} />
                        <div className="w-4 h-4 rounded-full" style={{ background: `rgb(${p.bg})` }} />
                        <div className="w-4 h-4 rounded-full" style={{ background: `rgb(${p.sidebar})` }} />
                      </div>
                      <span className="text-xs font-medium">{p.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {activeSection === "Sounds" && (
              <>
                <SectionTitle title="Sound & Feedback" />
                <ToggleSetting
                  label="Sound Effects"
                  description="Play sounds for interactions"
                  value={soundEnabled}
                  onChange={(v) => { setSoundEnabled(v); saveSetting("soundEnabled", v); if (v) playClick(0.5); }}
                />
                <ToggleSetting
                  label="Typing Sounds"
                  description="Play sounds while typing"
                  value={typingSoundsEnabled}
                  onChange={(v) => { setTypingSoundsEnabled(v); saveSetting("typingSoundsEnabled", v); }}
                />

                <div className="space-y-2">
                  <label className="text-sm font-medium">Master Volume</label>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[rgb(var(--text-secondary))]">🔈</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={masterVolume}
                      onChange={(e) => { setMasterVolume(Number(e.target.value)); saveSetting("masterVolume", Number(e.target.value)); }}
                      className="flex-1 accent-[rgb(var(--accent))]"
                    />
                    <span className="text-xs text-[rgb(var(--text-secondary))] w-8">{masterVolume}%</span>
                  </div>
                </div>

                <SectionTitle title="Sound Preview" />
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Click", fn: () => playClick(vol) },
                    { label: "Save", fn: () => playSave(vol) },
                    { label: "Notification", fn: () => playNotification(vol) },
                    { label: "AI Response", fn: () => playAiComplete(vol) },
                    { label: "Type", fn: () => playType(vol) },
                    { label: "Toggle", fn: () => playToggle(vol) },
                  ].map(({ label, fn }) => (
                    <button
                      key={label}
                      onClick={fn}
                      className="px-3 py-2 text-sm border border-[rgb(var(--border))] rounded-lg hover:bg-[rgb(var(--bg))] transition-colors text-left"
                    >
                      🔊 {label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {activeSection === "Editor" && (
              <>
                <SectionTitle title="Editor Settings" />
                <p className="text-sm text-[rgb(var(--text-secondary))]">
                  The editor supports Markdown syntax for formatting. Use keyboard shortcuts for quick formatting.
                </p>
                <div className="bg-[rgb(var(--bg))] rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span>Bold</span><kbd className="px-2 py-0.5 bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))] rounded text-xs">**text**</kbd></div>
                  <div className="flex justify-between"><span>Italic</span><kbd className="px-2 py-0.5 bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))] rounded text-xs">*text*</kbd></div>
                  <div className="flex justify-between"><span>Heading</span><kbd className="px-2 py-0.5 bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))] rounded text-xs">## Heading</kbd></div>
                  <div className="flex justify-between"><span>Checklist</span><kbd className="px-2 py-0.5 bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))] rounded text-xs">- [ ] Task</kbd></div>
                  <div className="flex justify-between"><span>Code</span><kbd className="px-2 py-0.5 bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))] rounded text-xs">```code```</kbd></div>
                </div>
              </>
            )}

            {activeSection === "AI" && (
              <>
                <SectionTitle title="AI Configuration" />
                <div className="bg-[rgb(var(--bg))] rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Provider</span>
                    <span className="text-sm text-[rgb(var(--text-secondary))]">Google Gemini</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Model</span>
                    <span className="text-sm text-[rgb(var(--text-secondary))]">gemini-3.6-flash</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">API Key</span>
                    <span className="text-sm text-green-500">✓ Configured (Server-side)</span>
                  </div>
                </div>

                <ToggleSetting
                  label="Use Current Note as Context"
                  description="Send the current note content with AI requests"
                  value={aiNoteContext}
                  onChange={(v) => { setAiNoteContext(v); saveSetting("aiNoteContext", v); }}
                />

                <div className="text-xs text-[rgb(var(--text-secondary))] bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                  ⚠️ The API key is stored securely on the server. It is never sent to the browser.
                </div>
              </>
            )}

            {activeSection === "Shortcuts" && (
              <>
                <SectionTitle title="Keyboard Shortcuts" />
                <div className="bg-[rgb(var(--bg))] rounded-lg p-4 space-y-3 text-sm">
                  {[
                    ["Command Palette", "⌘ K"],
                    ["Toggle Sidebar", "⌘ B"],
                    ["Toggle AI Panel", "⌘ \\"],
                    ["Settings", "⌘ ,"],
                  ].map(([action, shortcut]) => (
                    <div key={action} className="flex justify-between items-center">
                      <span>{action}</span>
                      <kbd className="px-2 py-1 bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))] rounded text-xs font-mono">{shortcut}</kbd>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeSection === "About" && (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">✦</div>
                <h3 className="text-xl font-bold mb-1 bg-gradient-to-r from-[rgb(var(--accent))] to-purple-500 bg-clip-text text-transparent">
                  Nexus Notes
                </h3>
                <p className="text-sm text-[rgb(var(--text-secondary))] mb-4">AI-Powered Notes Application</p>
                <p className="text-xs text-[rgb(var(--text-secondary))]">Version 1.0.0</p>
                <p className="text-xs text-[rgb(var(--text-secondary))] mt-1">Built with Next.js, PostgreSQL & Gemini AI</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h3 className="text-sm font-semibold text-[rgb(var(--text-secondary))] uppercase tracking-wider">{title}</h3>;
}

function ToggleSetting({
  label, description, value, onChange,
}: {
  label: string; description: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-[rgb(var(--text-secondary))]">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full transition-colors relative ${
          value ? "bg-[rgb(var(--accent))]" : "bg-[rgb(var(--border))]"
        }`}
      >
        <div
          className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-transform ${
            value ? "translate-x-5.5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
