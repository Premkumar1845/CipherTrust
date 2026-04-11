"use client";

import { useEffect, useState } from "react";
import { Award, Plus, ExternalLink, Shield, CheckCircle2 } from "lucide-react";
import { complianceApi, proofApi } from "@/lib/api";
import { useStore } from "@/lib/store";
import { StatusBadge, SectionHeader, EmptyState } from "@/components/ui/Cards";

export default function CertificatesPage() {
  const { activeOrg } = useStore();
  const [certs, setCerts] = useState<any[]>([]);
  const [verifiedProofs, setVerifiedProofs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState<number | null>(null);
  const [justIssued, setJustIssued] = useState<number | null>(null);
  const [error, setError] = useState("");

  const orgId = activeOrg?.id;

  const loadAll = async () => {
    if (!orgId) return;
    const [cr, pr] = await Promise.all([
      complianceApi.certificates(orgId).catch(() => ({ data: [] })),
      proofApi.list(orgId).catch(() => ({ data: [] })),
    ]);
    setCerts(cr.data);
    setVerifiedProofs(pr.data.filter((p: any) => p.status === "verified"));
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [orgId]);

  const handleIssue = async (proofId: number) => {
    if (!orgId) return;
    setIssuing(proofId);
    setError("");
    try {
      await complianceApi.issueCertificate(orgId, proofId);
      setJustIssued(proofId);
      setTimeout(() => setJustIssued(null), 2000);
      await loadAll();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Certificate issuance failed");
    } finally {
      setIssuing(null);
    }
  };

  const issuedProofIds = new Set(certs.map((c) => c.proof_id));
  const proofsPendingCert = verifiedProofs.filter((p) => !issuedProofIds.has(p.id));

  return (
    <div className="p-8 animate-fade-in">
      <SectionHeader
        title="Compliance Certificates"
        desc="Verifiable on-chain certificates issued as Algorand Standard Assets."
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/[0.08] border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Eligible proofs for certification */}
      {proofsPendingCert.length > 0 && (
        <div className="glass gradient-border p-5 mb-6 border-indigo-500/15">
          <p className="text-sm font-display font-semibold text-white mb-1">
            Ready to certify — {proofsPendingCert.length} verified proof{proofsPendingCert.length > 1 ? "s" : ""}
          </p>
          <p className="text-xs text-slate-500 mb-4">
            These proofs have been verified on Algorand and are eligible for certificate issuance.
          </p>
          <div className="space-y-2">
            {proofsPendingCert.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-500 ${justIssued === p.id
                  ? "bg-emerald-500/[0.08] border-emerald-500/25 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                  : "bg-white/[0.02] border-white/[0.06]"
                  }`}
              >
                <div className="flex items-center gap-3">
                  {justIssued === p.id && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-success-burst" />
                  )}
                  <span className="text-sm text-slate-300">{p.proof_type.replace(/_/g, " ")}</span>
                  <span className="text-xs text-slate-600">
                    · {new Date(p.verified_at || p.created_at).toLocaleDateString("en-IN")}
                  </span>
                </div>
                <button
                  onClick={() => handleIssue(p.id)}
                  disabled={issuing === p.id}
                  className="btn-primary flex items-center gap-2 text-xs px-3 py-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {issuing === p.id ? "Issuing..." : "Issue certificate"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certificates list as glass cards */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full crypto-loader" />
        </div>
      ) : certs.length === 0 ? (
        <EmptyState
          icon={<Award className="w-10 h-10" />}
          title="No certificates issued yet"
          desc="Submit and verify a ZK proof, then issue your compliance certificate here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {certs.map((cert) => (
            <div key={cert.id} className={`glass gradient-border hover-glow p-6 relative overflow-hidden ${cert.status === "compliant" || cert.status === "active" ? "confirm-wave" : ""}`}>
              {/* Status glow indicator */}
              {(cert.status === "compliant" || cert.status === "active") && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.04] rounded-full blur-[40px] pointer-events-none" />
              )}

              <div className="flex items-start justify-between relative">
                <div className="flex items-center gap-4">
                  {/* Certificate icon with glow */}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/15 to-violet-500/10 border border-indigo-500/15 flex items-center justify-center flex-shrink-0 ${cert.status === "compliant" || cert.status === "active"
                    ? "shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                    : "shadow-[0_0_15px_rgba(99,102,241,0.06)]"
                    }`}>
                    <Award className={`w-6 h-6 ${cert.status === "compliant" || cert.status === "active" ? "text-emerald-400" : "text-indigo-400"}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display font-semibold text-white">
                        {cert.regulation} Compliance Certificate
                      </h3>
                      <StatusBadge status={cert.status} />
                    </div>
                    <p className="text-xs text-slate-500">
                      Issued {cert.issued_at
                        ? new Date(cert.issued_at).toLocaleDateString("en-IN", {
                          day: "numeric", month: "long", year: "numeric",
                        })
                        : "—"}
                      {cert.expires_at &&
                        ` · Valid until ${new Date(cert.expires_at).toLocaleDateString("en-IN", {
                          day: "numeric", month: "long", year: "numeric",
                        })}`}
                    </p>
                  </div>
                </div>

                {cert.txn_id && (
                  <a
                    href={`https://testnet.algoexplorer.io/tx/${cert.txn_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-white/[0.08] hover:border-indigo-500/25 text-slate-400 hover:text-indigo-400 rounded-xl text-xs transition-all duration-200 hover:shadow-[0_0_10px_rgba(99,102,241,0.08)]"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View on Algorand
                  </a>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-white/[0.06] grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Proof ID</p>
                  <p className="text-xs text-slate-400">#{cert.proof_id}</p>
                </div>
                {cert.asset_id && (
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Asset ID (ASA)</p>
                    <p className="text-xs text-slate-400 font-mono">#{cert.asset_id}</p>
                  </div>
                )}
                {cert.txn_id && (
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Transaction</p>
                    <p className="font-mono text-xs text-indigo-300">
                      {cert.txn_id.slice(0, 10)}…
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Network</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(16,185,129,0.6)]" />
                    <p className="text-xs text-slate-400">Algorand TestNet</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
