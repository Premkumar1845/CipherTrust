"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, CheckCircle2, XCircle, Shield, ExternalLink, Loader2 } from "lucide-react";
import { complianceApi } from "@/lib/api";
import { HashDisplay, StatusBadge } from "@/components/ui/Cards";

function VerifyContent() {
  const params = useSearchParams();
  const [txnId, setTxnId] = useState(params.get("txn") || "");
  const [orgId, setOrgId] = useState(params.get("org") || "");
  const [result, setResult] = useState<any>(null);
  const [orgSummary, setOrgSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"txn" | "org">("org");

  const handleVerifyTxn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txnId.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await complianceApi.verifyByTxn(txnId.trim());
      setResult(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Transaction not found on Algorand");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId.trim()) return;
    setLoading(true);
    setError("");
    setOrgSummary(null);
    try {
      const res = await complianceApi.summary(Number(orgId.trim()));
      setOrgSummary(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Organisation not found");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-white mb-1">Verify Compliance</h1>
        <p className="text-sm text-slate-400">
          Cryptographically verify an organisation's compliance status using on-chain proof records.
        </p>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 p-1 glass rounded-xl mb-6 w-fit">
        {(["org", "txn"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-display font-semibold transition-all ${tab === t
              ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20"
              : "text-slate-400 hover:text-white"
              }`}
          >
            {t === "org" ? "By organisation" : "By transaction ID"}
          </button>
        ))}
      </div>

      {/* Org verification */}
      {tab === "org" && (
        <form onSubmit={handleVerifyOrg} className="flex gap-2 mb-6">
          <input
            type="number"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            placeholder="Organisation ID"
            className="input-field flex-1"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center gap-2 px-5"
          >
            {loading ? <Loader2 className="w-4 h-4 crypto-loader" /> : <Search className="w-4 h-4" />}
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>
      )}

      {/* Txn verification */}
      {tab === "txn" && (
        <form onSubmit={handleVerifyTxn} className="flex gap-2 mb-6">
          <input
            type="text"
            value={txnId}
            onChange={(e) => setTxnId(e.target.value)}
            placeholder="Algorand transaction ID"
            className="input-field flex-1 font-mono"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center gap-2 px-5"
          >
            {loading ? <Loader2 className="w-4 h-4 crypto-loader" /> : <Search className="w-4 h-4" />}
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>
      )}

      {error && (
        <div className="mb-6 flex items-start gap-3 px-4 py-4 rounded-xl bg-red-500/10 border border-red-500/20 glow-red">
          <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-400">Verification failed</p>
            <p className="text-xs text-red-300/70 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Org result */}
      {orgSummary && (
        <div className={`glass gradient-border p-6 animate-slide-up ${orgSummary.is_compliant ? "confirm-wave" : ""}`}>
          <div className="flex items-center gap-3 mb-6">
            {orgSummary.is_compliant ? (
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center shadow-lg shadow-emerald-500/20 glow-green">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Shield className="w-6 h-6 text-amber-400" />
              </div>
            )}
            <div>
              <h3 className="font-display font-bold text-white text-lg">{orgSummary.organization_name}</h3>
              <p className={`text-sm font-medium ${orgSummary.is_compliant ? "text-emerald-400" : "text-amber-400"}`}>
                {orgSummary.is_compliant ? "✓ COMPLIANT" : "⚠ COMPLIANCE PENDING"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              { label: "Active consents", value: orgSummary.active_consents },
              { label: "Verified ZK proofs", value: orgSummary.verified_proofs },
              { label: "Compliance score", value: `${Math.round(orgSummary.compliance_score)}/100` },
              { label: "Total proofs", value: orgSummary.total_proofs },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/[0.03] rounded-xl px-4 py-3 border border-white/[0.06] hover:border-indigo-500/15 transition-colors">
                <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                <p className="font-bold font-display text-white">{value}</p>
              </div>
            ))}
          </div>

          {orgSummary.latest_certificate && (
            <div className="border-t border-white/[0.06] pt-4">
              <p className="text-xs text-slate-400 mb-3 font-display font-semibold">Latest certificate</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm text-slate-300">
                    {orgSummary.latest_certificate.regulation} · Issued{" "}
                    {new Date(orgSummary.latest_certificate.issued_at).toLocaleDateString("en-IN")}
                  </span>
                  <StatusBadge status={orgSummary.latest_certificate.status} />
                </div>
                {orgSummary.latest_certificate.txn_id && (
                  <a
                    href={`https://lora.algokit.io/testnet/transaction/${orgSummary.latest_certificate.txn_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Algorand
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Txn result */}
      {result && (
        <div className="glass gradient-border p-6 animate-slide-up confirm-wave">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shadow-lg shadow-emerald-500/20 glow-green">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="font-medium text-white">Transaction verified</p>
              <p className="text-xs text-emerald-400">Found on Algorand {result.block ? `at block ${result.block}` : ""}</p>
            </div>
          </div>
          <div className="space-y-2">
            <HashDisplay hash={result.txn_id} label="Transaction ID" />
            {result.timestamp && (
              <div>
                <p className="text-xs text-slate-500">Timestamp</p>
                <p className="text-xs text-slate-300">
                  {new Date(result.timestamp * 1000).toLocaleString("en-IN")}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyContent />
    </Suspense>
  );
}
