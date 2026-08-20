"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";

export function LoginScreen() {
  const { setUserEmail } = useAppStore();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();

    if (!trimmed || !trimmed.includes("@") || !trimmed.includes(".")) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Run migration on first connect
      await fetch("/api/migrate", { method: "POST" }).catch(() => {});

      // Save email
      localStorage.setItem("nexus-email", trimmed);
      setUserEmail(trimmed);
    } catch {
      setError("Something went wrong. Please try again.");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--bg))] p-6">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-[rgb(var(--accent))] to-purple-500 shadow-lg shadow-purple-200 dark:shadow-purple-900/30 mb-6 animate-float">
            <span className="text-4xl text-white">✦</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            Welcome to <span className="bg-gradient-to-r from-[rgb(var(--accent))] to-purple-500 bg-clip-text text-transparent">Nexus</span>
          </h1>
          <p className="text-[rgb(var(--text-secondary))] text-lg">
            Your personal AI-powered notebook
          </p>
        </div>

        {/* Login card */}
        <div className="bg-[rgb(var(--card-bg))] rounded-2xl border border-[rgb(var(--border))] shadow-sm p-8">
          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-medium mb-2" htmlFor="email">
              Enter your email to get started
            </label>
            <input
              id="email"
              type="email"
              autoFocus
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              placeholder="you@example.com"
              className="w-full px-4 py-3.5 text-base bg-[rgb(var(--bg))] border border-[rgb(var(--border))] rounded-xl focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent))]/30 focus:border-[rgb(var(--accent))]/50 transition-all placeholder:text-[rgb(var(--text-secondary))]/50"
            />

            {error && (
              <p className="mt-2 text-sm text-red-500 animate-fade-in">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3.5 bg-gradient-to-r from-[rgb(var(--accent))] to-purple-500 text-white rounded-xl font-semibold text-base hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 shadow-md shadow-purple-200 dark:shadow-purple-900/30"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Continue →"
              )}
            </button>
          </form>

          <p className="mt-4 text-xs text-center text-[rgb(var(--text-secondary))]">
            Your email is used to save and sync your notes.
            <br />No password needed — just your email.
          </p>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-3 text-center">
          {[
            { icon: "📝", label: "Smart Notes" },
            { icon: "🤖", label: "AI Assistant" },
            { icon: "☁️", label: "Cloud Sync" },
          ].map((f) => (
            <div key={f.label} className="p-3 rounded-xl bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))]">
              <div className="text-2xl mb-1">{f.icon}</div>
              <div className="text-xs text-[rgb(var(--text-secondary))]">{f.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
