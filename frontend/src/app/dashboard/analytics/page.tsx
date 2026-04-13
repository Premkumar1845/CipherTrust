"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AlertTriangle, AlertCircle, Info, TrendingUp } from "lucide-react";
import { analyticsApi } from "@/lib/api";
import { useStore } from "@/lib/store";
import { StatCard, SectionHeader } from "@/components/ui/Cards";

const RechartsLineChart = dynamic(() => import("recharts").then((m) => m.LineChart), { ssr: false });
const RechartsBarChart = dynamic(() => import("recharts").then((m) => m.BarChart), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });
const Line = dynamic(() => import("recharts").then((m) => m.Line), { ssr: false }) as any;
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false }) as any;
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false }) as any;
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false }) as any;
const CartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), { ssr: false }) as any;
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false }) as any;

const RISK_ICON: Record<string, React.ReactNode> = {
  high: <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />,
  medium: <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />,
  low: <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />,
};

const RISK_STYLE: Record<string, string> = {
  high: "border-red-500/20 bg-red-500/5 rounded-xl",
  medium: "border-amber-500/20 bg-amber-500/5 rounded-xl",
  low: "border-indigo-500/20 bg-indigo-500/5 rounded-xl",
};

const GRADE_COLOR: Record<string, string> = {
  A: "text-emerald-400",
  B: "text-teal-400",
  C: "text-amber-400",
  D: "text-orange-400",
  F: "text-red-400",
};

export default function AnalyticsPage() {
  const { activeOrg } = useStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!activeOrg) return;
    analyticsApi
      .dashboard(activeOrg.id)
      .then((r) => setData(r.data))
      .catch((e) => setError(e?.response?.data?.detail || "Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [activeOrg?.id]);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex items-center justify-center min-h-[400px]">
        <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full crypto-loader" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <p className="text-red-400 text-sm rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">{error}</p>
      </div>
    );
  }

  const riskFlags: any[] = data?.risk_flags ?? [];
  const trend: any[] = data?.trend ?? [];
  const score: number = data?.score ?? 0;
  const grade: string = data?.grade ?? "F";

  const highFlags = riskFlags.filter((f) => f.level === "high");
  const mediumFlags = riskFlags.filter((f) => f.level === "medium");
  const lowFlags = riskFlags.filter((f) => f.level === "low");

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in max-w-full overflow-hidden">
      <SectionHeader
        title="Compliance Analytics"
        desc="Score breakdown, risk flags, and 30-day activity trend."
      />

      {/* Score + grade */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass gradient-border p-5 md:col-span-1 flex flex-col items-center justify-center text-center crypto-pulse">
          <p className="text-xs text-slate-400 mb-1 font-display">Compliance grade</p>
          <p className={`text-6xl font-bold font-display ${GRADE_COLOR[grade]}`}>{grade}</p>
          <p className="text-xs text-slate-500 mt-1">Score: {score}/100</p>
        </div>
        <StatCard
          label="Risk flags (high)"
          value={highFlags.length}
          accent={highFlags.length > 0 ? "red" : "emerald"}
        />
        <StatCard
          label="Risk flags (medium)"
          value={mediumFlags.length}
          accent={mediumFlags.length > 0 ? "amber" : "emerald"}
        />
        <StatCard
          label="Risk flags (low)"
          value={lowFlags.length}
          accent="indigo"
        />
      </div>

      {/* Score gauge bar */}
      <div className="glass gradient-border p-4 sm:p-5 mb-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-slate-400 font-display">Compliance score</p>
          <p className="text-sm font-bold font-display text-white">{score} / 100</p>
        </div>
        <div className="w-full h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${score}%`,
              background: score >= 75
                ? "linear-gradient(90deg, #10b981, #34d399)"
                : score >= 50
                  ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                  : "linear-gradient(90deg, #ef4444, #f87171)",
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          {["F", "D", "C", "B", "A"].map((g, i) => (
            <span key={g} className={`text-xs ${GRADE_COLOR[g]} opacity-60`}>{g}</span>
          ))}
        </div>
      </div>

      {/* Risk flags */}
      {riskFlags.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-display font-semibold text-slate-300 mb-3">
            Active risk flags ({riskFlags.length})
          </h3>
          <div className="space-y-2">
            {riskFlags.map((flag, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-4 rounded-lg border ${RISK_STYLE[flag.level]}`}
              >
                {RISK_ICON[flag.level]}
                <div>
                  <p className="text-xs font-mono text-slate-500 mb-0.5">{flag.code}</p>
                  <p className="text-sm text-slate-300">{flag.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {riskFlags.length === 0 && (
        <div className="mb-8 flex items-center gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 glow-green">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <p className="text-sm text-emerald-300">No active risk flags — compliance posture is healthy.</p>
        </div>
      )}

      {/* Trend charts */}
      {trend.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Consent trend */}
          <div className="glass gradient-border p-5">
            <p className="text-xs text-slate-400 mb-4 font-display font-semibold">Consent records — 30 days</p>
            <ResponsiveContainer width="100%" height={160}>
              <RechartsBarChart data={trend} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  tickFormatter={(v) => v.slice(5)}
                  tickLine={false}
                  axisLine={false}
                  interval={6}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15,23,42,0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    color: "#e2e8f0",
                    backdropFilter: "blur(12px)",
                  }}
                  cursor={{ fill: "rgba(99,102,241,0.05)" }}
                />
                <Bar dataKey="consents" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>

          {/* Proof trend */}
          <div className="glass gradient-border p-5">
            <p className="text-xs text-slate-400 mb-4 font-display font-semibold">ZK proofs generated — 30 days</p>
            <ResponsiveContainer width="100%" height={160}>
              <RechartsLineChart data={trend} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  tickFormatter={(v) => v.slice(5)}
                  tickLine={false}
                  axisLine={false}
                  interval={6}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15,23,42,0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    color: "#e2e8f0",
                    backdropFilter: "blur(12px)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="proofs"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#10b981" }}
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
