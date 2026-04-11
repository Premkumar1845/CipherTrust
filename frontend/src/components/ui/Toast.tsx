"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle2, XCircle, AlertCircle, X } from "lucide-react";
import clsx from "clsx";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  error: <XCircle className="w-4 h-4 text-red-400" />,
  info: <AlertCircle className="w-4 h-4 text-indigo-400" />,
};

const STYLES: Record<ToastType, string> = {
  success: "border-emerald-500/20 bg-emerald-500/[0.06] shadow-[0_0_20px_rgba(16,185,129,0.06)]",
  error: "border-red-500/20 bg-red-500/[0.06] shadow-[0_0_20px_rgba(239,68,68,0.06)]",
  info: "border-indigo-500/20 bg-indigo-500/[0.06] shadow-[0_0_20px_rgba(99,102,241,0.06)]",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => remove(id), 4000);
  }, [remove]);

  const ctx: ToastContextValue = {
    toast: add,
    success: (m) => add(m, "success"),
    error: (m) => add(m, "error"),
    info: (m) => add(m, "info"),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {/* Toast stack */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              "flex items-start gap-3 p-4 rounded-2xl border glass-strong animate-slide-up pointer-events-auto",
              STYLES[t.type]
            )}
          >
            {ICONS[t.type]}
            <p className="text-sm text-slate-300 flex-1 leading-snug">{t.message}</p>
            <button
              onClick={() => remove(t.id)}
              className="text-slate-500 hover:text-slate-300 flex-shrink-0 mt-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
