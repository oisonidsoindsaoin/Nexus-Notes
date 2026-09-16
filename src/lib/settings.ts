"use client";

import type { Theme } from "./store";

export interface ThemePreset {
  name: string;
  accent: string;
  bg: string;
  sidebar: string;
  card: string;
  text: string;
  border: string;
}

export function applyPresetVars(preset: ThemePreset) {
  const root = document.documentElement;
  root.style.setProperty("--accent", preset.accent);
  root.style.setProperty("--bg", preset.bg);
  root.style.setProperty("--sidebar-bg", preset.sidebar);
  root.style.setProperty("--card-bg", preset.card);
  root.style.setProperty("--text", preset.text);
  root.style.setProperty("--border", preset.border);
}

export function clearPresetVars() {
  const root = document.documentElement;
  for (const v of ["--accent", "--bg", "--sidebar-bg", "--card-bg", "--text", "--border"]) {
    root.style.removeProperty(v);
  }
}

/** Saves to the database AND caches locally so it survives offline / slow networks. */
export async function saveSetting(email: string | null, key: string, value: unknown) {
  try {
    localStorage.setItem(`nexus-setting-${key}`, JSON.stringify(value));
  } catch { /* ignore */ }

  if (!email) return;
  try {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-email": email },
      body: JSON.stringify({ key, value }),
    });
  } catch { /* offline — local cache still holds it */ }
}

export function readLocalSetting<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(`nexus-setting-${key}`);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export interface LoadedSettings {
  theme?: Theme;
  themePreset?: ThemePreset | null;
  soundEnabled?: boolean;
  typingSoundsEnabled?: boolean;
  masterVolume?: number;
  aiNoteContext?: boolean;
}

export async function loadSettings(email: string): Promise<LoadedSettings> {
  // Start from the local cache so the UI is correct immediately.
  const local: LoadedSettings = {
    theme: readLocalSetting<Theme>("theme"),
    themePreset: readLocalSetting<ThemePreset | null>("themePreset"),
    soundEnabled: readLocalSetting<boolean>("soundEnabled"),
    typingSoundsEnabled: readLocalSetting<boolean>("typingSoundsEnabled"),
    masterVolume: readLocalSetting<number>("masterVolume"),
    aiNoteContext: readLocalSetting<boolean>("aiNoteContext"),
  };

  try {
    const res = await fetch("/api/settings", { headers: { "x-user-email": email } });
    if (res.ok) {
      const remote = (await res.json()) as Record<string, unknown>;
      // Server is the source of truth when it has a value.
      return {
        theme: (remote.theme as Theme) ?? local.theme,
        themePreset: (remote.themePreset as ThemePreset) ?? local.themePreset,
        soundEnabled: (remote.soundEnabled as boolean) ?? local.soundEnabled,
        typingSoundsEnabled: (remote.typingSoundsEnabled as boolean) ?? local.typingSoundsEnabled,
        masterVolume: (remote.masterVolume as number) ?? local.masterVolume,
        aiNoteContext: (remote.aiNoteContext as boolean) ?? local.aiNoteContext,
      };
    }
  } catch { /* offline — fall back to local */ }

  return local;
}
