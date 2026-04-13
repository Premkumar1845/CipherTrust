import clsx from "clsx";

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "indigo" | "emerald" | "amber" | "red";
  icon?: React.ReactNode;
}

const accentConfig = {
  indigo: { text: "text-indigo-400", glow: "shadow-[0_0_20px_rgba(99,102,241,0.08)]", gradient: "from-indigo-500/10 to-transparent", dot: "bg-indigo-400" },
  emerald: { text: "text-emerald-400", glow: "shadow-[0_0_20px_rgba(16,185,129,0.08)]", gradient: "from-emerald-500/10 to-transparent", dot: "bg-emerald-400" },
  amber: { text: "text-amber-400", glow: "shadow-[0_0_20px_rgba(245,158,11,0.08)]", gradient: "from-amber-500/10 to-transparent", dot: "bg-amber-400" },
  red: { text: "text-red-400", glow: "shadow-[0_0_20px_rgba(239,68,68,0.08)]", gradient: "from-red-500/10 to-transparent", dot: "bg-red-400" },
};

export function StatCard({ label, value, sub, accent = "indigo", icon }: StatCardProps) {
  const cfg = accentConfig[accent];

  return (
    <div className={clsx(
      "glass gradient-border hover-glow p-5 relative overflow-hidden",
      cfg.glow
    )}>
      {/* Subtle gradient overlay */}
      <div className={clsx("absolute top-0 left-0 w-full h-1 bg-gradient-to-r opacity-60", cfg.gradient)} />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2">{label}</p>
          <p className={clsx("text-3xl font-display font-bold tracking-tight", cfg.text)}>{value}</p>
          {sub && <p className="text-xs text-slate-600 mt-1.5">{sub}</p>}
        </div>
        {icon && (
          <div className={clsx("p-2 rounded-xl bg-gradient-to-br", cfg.gradient)}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

type Status = "compliant" | "non_compliant" | "pending" | "verified" | "failed" | "generating" | "generated" | "active" | "revoked";

const statusStyles: Record<string, string> = {
  compliant: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.06)]",
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.06)]",
  verified: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-[0_0_8px_rgba(99,102,241,0.06)]",
  generated: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-[0_0_8px_rgba(99,102,241,0.06)]",
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  generating: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  pending_review: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
  non_compliant: "bg-red-500/10 text-red-400 border-red-500/20",
  revoked: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

interface BadgeProps {
  status: string;
  label?: string;
}

export function StatusBadge({ status, label }: BadgeProps) {
  const styles = statusStyles[status] ?? "bg-slate-500/10 text-slate-400 border-slate-500/20";
  return (
    <span className={clsx("inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium border", styles)}>
      {label || status.replace(/_/g, " ")}
    </span>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="text-center py-20">
      <div className="flex justify-center mb-5 text-slate-600">{icon}</div>
      <p className="text-slate-300 font-display font-semibold mb-1.5">{title}</p>
      <p className="text-sm text-slate-600 max-w-xs mx-auto">{desc}</p>
    </div>
  );
}

// ─── Hash display ─────────────────────────────────────────────────────────────

export function HashDisplay({ hash, label }: { hash?: string | null; label?: string }) {
  if (!hash) return <span className="text-slate-600 text-xs">—</span>;
  return (
    <div>
      {label && <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>}
      <span className="font-mono text-xs text-indigo-300 bg-indigo-500/[0.06] px-2.5 py-1 rounded-lg border border-indigo-500/10">
        {hash.slice(0, 8)}…{hash.slice(-6)}
      </span>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

export function SectionHeader({
  title,
  desc,
  action,
}: {
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 sm:mb-8">
      <div>
        <h2 className="font-display font-bold text-lg text-white tracking-tight">{title}</h2>
        {desc && <p className="text-sm text-slate-500 mt-1">{desc}</p>}
      </div>
      {action}
    </div>
  );
}
