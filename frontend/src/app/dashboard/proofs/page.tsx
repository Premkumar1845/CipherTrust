"use client";

import { useEffect, useState, useCallback } from "react";
import { Key, Plus, Send, ExternalLink, CheckCircle2, XCircle, Hash, Loader2 } from "lucide-react";
import { proofApi, consentApi } from "@/lib/api";
import { useStore } from "@/lib/store";
import { StatusBadge, HashDisplay, SectionHeader, EmptyState } from "@/components/ui/Cards";

function HashScramble({ hash, active }: { hash: string; active: boolean }) {
  const [display, setDisplay] = useState(hash);
  const chars = "0123456789abcdef";

  useEffect(() => {
    if (!active) { setDisplay(hash); return; }
    let frame = 0;
    const maxFrames = 20;
    const interval = setInterval(() => {
      frame++;
      if (frame >= maxFrames) { setDisplay(hash); clearInterval(interval); return; }
      setDisplay(
        hash.split("").map((c, i) =>
          i < (frame / maxFrames) * hash.length ? c : chars[Math.floor(Math.random() * chars.length)]
        ).join("")
      );
    }, 50);
    return () => clearInterval(interval);
  }, [hash, active]);

  return (
    <span className="font-mono text-xs text-indigo-300 bg-indigo-500/[0.06] px-2.5 py-1 rounded-lg border border-indigo-500/10">
      {display.slice(0, 8)}…{display.slice(-6)}
    </span>
  );
}

export default function ProofsPage() {
  const { activeOrg } = useStore();
  const [proofs, setProofs] = useState<any[]>([]);
  const [consents, setConsents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationSuccess, setGenerationSuccess] = useState(false);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [showGen, setShowGen] = useState(false);
  const [selectedConsents, setSelectedConsents] = useState<number[]>([]);
  const [error, setError] = useState("");

  const orgId = activeOrg?.id;

  const loadAll = useCallback(async () => {
    if (!orgId) return;
    const [pr, cr] = await Promise.all([
      proofApi.list(orgId).catch(() => ({ data: [] })),
      consentApi.list(orgId).catch(() => ({ data: [] })),
    ]);
    setProofs(pr.data);
    setConsents(cr.data.filter((c: any) => c.status === "active"));
    setLoading(false);
  }, [orgId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleGenerate = async () => {
    if (!orgId || selectedConsents.length === 0) return;
    setGenerating(true);
    setError("");
    setGenerationSuccess(false);
    try {
      await proofApi.generate(orgId, selectedConsents);
      setGenerationSuccess(true);
      setTimeout(() => {
        setShowGen(false);
        setSelectedConsents([]);
        setGenerationSuccess(false);
        loadAll();
      }, 1500);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Proof generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (proofId: number) => {
    if (!orgId) return;
    setSubmitting(proofId);
    setError("");
    try {
      await proofApi.submit(orgId, proofId);
      await loadAll();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Submission failed");
    } finally {
      setSubmitting(null);
    }
  };

  const toggleConsent = (id: number) => {
    setSelectedConsents((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-8 animate-fade-in">
      <SectionHeader
        title="ZK Proofs"
        desc="Generate cryptographic proofs of consent compliance and submit to Algorand."
        action={
          <button
            onClick={() => setShowGen(!showGen)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Generate proof
          </button>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/[0.08] border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Generate panel */}
      {showGen && (
        <div className="glass gradient-border p-6 mb-6 animate-slide-up relative overflow-hidden">
          {/* Neon scan line during generation */}
          {generating && <div className="neon-scan absolute inset-0 pointer-events-none" />}

          {/* Success burst */}
          {generationSuccess && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#0B1326]/60 backdrop-blur-sm rounded-2xl">
              <div className="text-center animate-success-burst">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                <p className="text-emerald-400 font-display font-semibold">Proof Generated!</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/15 to-violet-500/10 flex items-center justify-center">
              <Hash className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-display font-semibold text-white">Select consent records to prove</h3>
              <p className="text-xs text-slate-500">
                The ZK proof will cryptographically attest these records meet DPDPA compliance.
              </p>
            </div>
          </div>

          {consents.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">
              No active consent records found. Add consent records first.
            </p>
          ) : (
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {consents.map((c) => (
                <label
                  key={c.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all duration-200 ${selectedConsents.includes(c.id)
                    ? "border-indigo-500/30 bg-indigo-500/[0.06] shadow-[0_0_10px_rgba(99,102,241,0.06)]"
                    : "border-white/[0.06] hover:border-indigo-500/25"
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedConsents.includes(c.id)}
                    onChange={() => toggleConsent(c.id)}
                    className="accent-indigo-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-300">{c.consent_type.replace(/_/g, " ")}</span>
                      <HashDisplay hash={c.user_identifier_hash} />
                    </div>
                    <p className="text-xs text-slate-600 truncate">{c.purpose}</p>
                  </div>
                  {c.is_anchored && (
                    <span className="text-xs text-emerald-500 flex-shrink-0">⚓ on-chain</span>
                  )}
                </label>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={generating || selectedConsents.length === 0}
              className="btn-primary flex items-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 crypto-loader" />
                  Generating proof...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  Generate proof ({selectedConsents.length} records)
                </>
              )}
            </button>
            <button
              onClick={() => setShowGen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Proofs list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full crypto-loader" />
        </div>
      ) : proofs.length === 0 ? (
        <EmptyState
          icon={<Key className="w-10 h-10" />}
          title="No proofs generated yet"
          desc="Select consent records above to generate your first ZK proof."
        />
      ) : (
        <div className="space-y-3">
          {proofs.map((p, idx) => (
            <div key={p.id} className="glass gradient-border hover-glow p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-white">
                      {p.proof_type.replace(/_/g, " ")}
                    </span>
                    <StatusBadge status={p.status} />
                    {p.verification_result === true && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 glow-green animate-pulse" />
                    )}
                    {p.verification_result === false && (
                      <XCircle className="w-4 h-4 text-red-400 glow-red animate-pulse" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2">
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Proof hash</p>
                      <HashScramble hash={p.proof_hash || ""} active={idx === 0} />
                    </div>
                    {p.public_inputs && (
                      <div>
                        <p className="text-xs text-slate-500 mb-0.5">Consent count</p>
                        <span className="text-sm text-slate-300">
                          {p.public_inputs.consent_count ?? "—"}
                        </span>
                      </div>
                    )}
                    {p.txn_id && (
                      <div>
                        <p className="text-xs text-slate-500 mb-0.5">Transaction</p>
                        <a
                          href={`https://testnet.algoexplorer.io/tx/${p.txn_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          {p.txn_id.slice(0, 10)}… <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Created</p>
                      <span className="text-xs text-slate-400">
                        {new Date(p.created_at).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Submit action */}
                {p.status === "generated" && (
                  <button
                    onClick={() => handleSubmit(p.id)}
                    disabled={submitting === p.id}
                    className="flex items-center gap-2 px-3 py-2 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs transition-all duration-200 ml-4 flex-shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.05)] hover:shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {submitting === p.id ? "Submitting..." : "Submit on-chain"}
                  </button>
                )}
              </div>

              {/* Public inputs detail */}
              {p.public_inputs && p.status === "verified" && (
                <div className="mt-4 pt-4 border-t border-white/[0.06]">
                  <p className="text-xs text-slate-500 mb-2">Public inputs (visible to regulator)</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(p.public_inputs).map(([k, v]) => (
                      <div key={k}>
                        <p className="text-xs text-slate-600">{k}</p>
                        <p className="font-mono text-xs text-slate-400 truncate">
                          {typeof v === "string" ? `${v.slice(0, 16)}…` : String(v)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
