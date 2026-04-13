"use client";

import { useEffect, useState } from "react";
import { Shield, AlertCircle, CheckCircle2, ExternalLink, Users, Key, Award, ArrowRight, Activity, Loader2 } from "lucide-react";
import { complianceApi, orgApi } from "@/lib/api";
import { useStore } from "@/lib/store";
import { StatCard, StatusBadge, HashDisplay } from "@/components/ui/Cards";
import { AnimatedLogo } from "@/components/ui/AnimatedLogo";
import Link from "next/link";

export default function DashboardPage() {
  const { activeOrg, setActiveOrg } = useStore();
  const walletAddress = useStore((s) => s.walletAddress);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scoreAnimated, setScoreAnimated] = useState(0);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (!activeOrg) {
      orgApi.list().then((res) => {
        if (res.data.length > 0) {
          setActiveOrg(res.data[0]);
        } else {
          setLoading(false);
        }
      });
      return;
    }

    complianceApi
      .summary(activeOrg.id)
      .then((res) => setSummary(res.data))
      .catch((e) => setError(e?.response?.data?.detail || "Failed to load summary"))
      .finally(() => setLoading(false));
  }, [activeOrg]);

  // Animate score counter
  useEffect(() => {
    const target = summary?.compliance_score ?? 0;
    if (target === 0) return;
    let current = 0;
    const step = target / 40;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { setScoreAnimated(target); clearInterval(timer); }
      else setScoreAnimated(current);
    }, 25);
    return () => clearInterval(timer);
  }, [summary?.compliance_score]);

  if (!activeOrg) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="glass-strong gradient-border p-6 sm:p-10 text-center max-w-md mx-auto animate-scale-in">
          <div className="flex justify-center mb-5">
            <AnimatedLogo size={72} />
          </div>
          <h2 className="font-display font-bold text-white text-lg mb-2">No organisation found</h2>
          <p className="text-sm text-slate-500 mb-6">
            Create your organisation to get started with compliance management.
          </p>
          <Link href="/register" className="btn-primary inline-flex items-center gap-2">
            Register organisation
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex items-center justify-center min-h-[400px]">
        <div className="crypto-loader">
          <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  const score = summary?.compliance_score ?? 0;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-8 sm:mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-display font-bold text-white tracking-tight">{activeOrg.name}</h1>
            {summary?.is_compliant ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium bg-emerald-500/[0.08] text-emerald-400 border border-emerald-500/15 shadow-[0_0_12px_rgba(16,185,129,0.08)] glow-green">
                <CheckCircle2 className="w-3 h-3" />
                COMPLIANT
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/15">
                <AlertCircle className="w-3 h-3" />
                PENDING
              </span>
            )}
          </div>
          {activeOrg.did && (
            <HashDisplay hash={activeOrg.did} label="DID" />
          )}
        </div>

        {/* Compliance score ring */}
        <div className="text-center">
          <div className="relative w-24 h-24 crypto-pulse">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(99,102,241,0.08)" strokeWidth="2" />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke="url(#scoreGradient)" strokeWidth="2.5"
                strokeDasharray={`${scoreAnimated} ${100 - scoreAnimated}`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xl font-display font-bold text-indigo-400">
              {Math.round(scoreAnimated)}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-wider font-medium">Score</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/[0.08] border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 sm:mb-10">
        <StatCard label="Total consents" value={summary?.total_consents ?? 0} accent="indigo" icon={<Users className="w-5 h-5 text-indigo-400" />} />
        <StatCard label="Active consents" value={summary?.active_consents ?? 0} accent="emerald" icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />} />
        <StatCard label="ZK proofs generated" value={summary?.total_proofs ?? 0} accent="indigo" icon={<Key className="w-5 h-5 text-indigo-400" />} />
        <StatCard label="Proofs verified" value={summary?.verified_proofs ?? 0} accent="emerald" icon={<Award className="w-5 h-5 text-emerald-400" />} />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 sm:mb-10">
        {[
          { href: "/dashboard/consent", title: "Add consent record", desc: "Log user consent hashes for DPDPA compliance", icon: Users },
          { href: "/dashboard/proofs", title: "Generate ZK proof", desc: "Create cryptographic compliance evidence", icon: Key },
          { href: "/dashboard/certificates", title: "View certificates", desc: "On-chain compliance certificates (ASAs)", icon: Award },
        ].map(({ href, title, desc, icon: Icon }) => (
          <Link key={href} href={href} className="glass gradient-border hover-glow p-4 sm:p-6 group">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/15 to-violet-500/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Icon className="w-5 h-5 text-indigo-400" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="font-display font-semibold text-white mb-1 group-hover:text-indigo-300 transition-colors">
              {title}
            </p>
            <p className="text-xs text-slate-500">{desc}</p>
          </Link>
        ))}
      </div>

      {/* Latest certificate */}
      {summary?.latest_certificate && (
        <div>
          <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Latest certificate</h3>
          <div className="glass gradient-border p-4 sm:p-5 confirm-wave">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/15 to-violet-500/5 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-display font-semibold text-white">
                    {summary.latest_certificate.regulation} Certificate
                  </p>
                  <p className="text-xs text-slate-500">
                    Issued {new Date(summary.latest_certificate.issued_at).toLocaleDateString("en-IN")}
                    {summary.latest_certificate.expires_at &&
                      ` · Expires ${new Date(summary.latest_certificate.expires_at).toLocaleDateString("en-IN")}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={summary.latest_certificate.status} />
                {summary.latest_certificate.txn_id && (
                  <a
                    href={`https://lora.algokit.io/testnet/transaction/${summary.latest_certificate.txn_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-500 hover:text-indigo-400 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* On-chain registration prompt */}
      {!activeOrg.is_registered_onchain && (
        <div className="mt-6 sm:mt-8 glass p-4 sm:p-6 border-amber-500/15 bg-amber-500/[0.04]">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-display font-semibold text-amber-300 mb-1">Register on Algorand</p>
              <p className="text-xs text-slate-400 mb-4">
                Register your organisation&apos;s DID on-chain to start submitting compliance proofs.
              </p>
              <button
                disabled={registering}
                onClick={async () => {
                  setRegistering(true);
                  setError("");
                  try {
                    const addr = walletAddress || "DEPLOYER";
                    const res = await orgApi.registerOnchain(activeOrg.id, addr);
                    setActiveOrg(res.data);
                  } catch (e: any) {
                    setError(e?.response?.data?.detail || "On-chain registration failed");
                  } finally {
                    setRegistering(false);
                  }
                }}
                className="btn-primary inline-flex items-center gap-2 text-sm"
              >
                {registering ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Registering on-chain...</>
                ) : (
                  <><Shield className="w-4 h-4" />Register on Algorand</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
