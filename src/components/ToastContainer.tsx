"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

export function ToastContainer() {
  const { toasts, removeToast } = useAppStore();

  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        removeToast(toasts[0].id);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toasts, removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[70] space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-up backdrop-blur-sm ${
            toast.type === "success"
              ? "bg-green-500/90 text-white"
              : toast.type === "error"
              ? "bg-red-500/90 text-white"
              : toast.type === "warning"
              ? "bg-yellow-500/90 text-white"
              : "bg-[rgb(var(--card-bg))]/90 text-[rgb(var(--text))] border border-[rgb(var(--border))]"
          }`}
        >
          <span>
            {toast.type === "success" && "✓"}
            {toast.type === "error" && "⚠"}
            {toast.type === "warning" && "⚠"}
            {toast.type === "info" && "ℹ"}
          </span>
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-2 opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
