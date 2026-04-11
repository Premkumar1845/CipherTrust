"use client";

import { AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4"
      onClick={onCancel}
    >
      <div
        className="glass-strong gradient-border w-full max-w-sm p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${destructive ? "bg-red-500/10 shadow-[0_0_12px_rgba(239,68,68,0.08)]" : "bg-amber-500/10"
            }`}>
            <AlertTriangle className={`w-4.5 h-4.5 ${destructive ? "text-red-400" : "text-amber-400"}`} />
          </div>
          <div>
            <h3 className="font-display font-semibold text-white mb-1">{title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 justify-end mt-6">
          <button
            onClick={onCancel}
            className="btn-secondary"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 text-white ${destructive
                ? "bg-red-600 hover:bg-red-500 shadow-[0_0_16px_rgba(239,68,68,0.15)]"
                : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-glow-sm"
              }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
