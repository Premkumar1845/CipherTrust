"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, Shield, TrendingUp, Activity } from "lucide-react";
import { orgApi, complianceApi } from "@/lib/api";
import { StatCard, StatusBadge, HashDisplay } from "@/components/ui/Cards";
import Link from "next/link";

interface OrgSummary {
  org: any;
  summary: any | null;
}

export default function RegulatorPage() {
  const [orgs, setOrgs] = useState<OrgSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orgApi.list().then(async (res) => {
      const orgList = res.data;
      const summaries = await Promise.all(
        orgList.map((org: any) =>
          complianceApi
            .summary(org.id)
            .then((r) => ({ org, summary: r.data }))
            .catch(() => ({ org, summary: null }))
        )
      );
      setOrgs(summaries);
      setLoading(false);
    });
  }, []);

  const compliant = orgs.filter((o) => o.summary?.is_compliant).length;
  const total = orgs.length;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in max-w-full overflow-hidden">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-2xl font-display font-bold text-white">Regulator Dashboard</h1>
        </div>
        <p className="text-sm text-slate-400 ml-11">
          Real-time compliance status across all registered organisations.
          All data is cryptographically verified — no personal data is accessible.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total organisations" value={total} icon={<Activity className="w-5 h-5 text-indigo-400" />} />
        <StatCard label="Compliant" value={compliant} accent="emerald" icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />} />
        <StatCard label="Non-compliant" value={total - compliant} accent="red" icon={<XCircle className="w-5 h-5 text-red-400" />} />
        <StatCard
          label="Compliance rate"
          value={total > 0 ? `${Math.round((compliant / total) * 100)}%` : "—"}
          accent="indigo"
          icon={<TrendingUp className="w-5 h-5 text-indigo-400" />}
        />
      </div>

      {/* Org list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="crypto-loader">
            <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full" />
          </div>
        </div>
      ) : orgs.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-sm">
          No organisations registered yet.
        </div>
      ) : (
        <div className="space-y-3">
          {orgs.map(({ org, summary }) => (
            <div key={org.id} className={`glass gradient-border hover-glow p-4 sm:p-5 ${summary?.is_compliant ? "confirm-wave" : ""}`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Compliance indicator with glow */}
                  <div className="flex-shrink-0">
                    {summary?.is_compliant ? (
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center glow-green">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      </div>
                    ) : summary ? (
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-amber-400" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-500/10 flex items-center justify-center">
                        <XCircle className="w-5 h-5 text-slate-500" />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-display font-semibold text-white">{org.name}</h3>
                      {summary?.latest_certificate && (
                        <StatusBadge status={summary.latest_certificate.status} />
                      )}
                    </div>
                    <HashDisplay hash={org.did} label="DID" />
                  </div>
                </div>

                {/* Score and actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                  {summary && (
                    <div className="grid grid-cols-3 gap-6 text-center">
                      <div>
                        <p className="text-lg font-semibold text-indigo-400">
                          {summary.active_consents}
                        </p>
                        <p className="text-xs text-slate-500">Consents</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-indigo-400">
                          {summary.verified_proofs}
                        </p>
                        <p className="text-xs text-slate-500">ZK Proofs</p>
                      </div>
                      <div>
                        <p className={`text-lg font-semibold ${summary.compliance_score >= 75 ? "text-emerald-400" : summary.compliance_score >= 50 ? "text-amber-400" : "text-red-400"}`}>
                          {Math.round(summary.compliance_score)}
                        </p>
                        <p className="text-xs text-slate-500">Score</p>
                      </div>
                    </div>
                  )}

                  <Link
                    href={`/regulator/verify?org=${org.id}`}
                    className="px-3 py-2 border border-white/[0.06] hover:border-indigo-500/30 text-slate-400 hover:text-indigo-400 rounded-xl text-xs transition-all hover:shadow-lg hover:shadow-indigo-500/10"
                  >
                    View details →
                  </Link>
                </div>
              </div>

              {/* Certificate strip */}
              {summary?.latest_certificate && (
                <div className="mt-4 pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-slate-400">
                      {summary.latest_certificate.regulation} certificate
                    </span>
                    <span>·</span>
                    <span>
                      Issued {new Date(summary.latest_certificate.issued_at).toLocaleDateString("en-IN")}
                    </span>
                    {summary.latest_certificate.expires_at && (
                      <>
                        <span>·</span>
                        <span>
                          Expires {new Date(summary.latest_certificate.expires_at).toLocaleDateString("en-IN")}
                        </span>
                      </>
                    )}
                  </div>
                  {summary.latest_certificate.txn_id && (
                    <a
                      href={`https://lora.algokit.io/testnet/transaction/${summary.latest_certificate.txn_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-mono rounded-xl bg-white/[0.02] px-2.5 py-1 border border-white/[0.06] hover:border-indigo-500/30"
                    >
                      {summary.latest_certificate.txn_id.slice(0, 12)}… ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
