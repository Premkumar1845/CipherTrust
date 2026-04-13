"use client";

import { useEffect, useState } from "react";
import { Users, Plus, Anchor, Trash2, ExternalLink } from "lucide-react";
import { consentApi } from "@/lib/api";
import { useStore } from "@/lib/store";
import { StatusBadge, HashDisplay, SectionHeader, EmptyState } from "@/components/ui/Cards";
import { useToast } from "@/components/ui/Toast";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

const CONSENT_TYPES = [
  { value: "data_processing", label: "Data Processing" },
  { value: "marketing", label: "Marketing" },
  { value: "analytics", label: "Analytics" },
  { value: "third_party_sharing", label: "Third-party Sharing" },
];

export default function ConsentPage() {
  const { activeOrg } = useStore();
  const toast = useToast();
  const [consents, setConsents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [anchoring, setAnchoring] = useState<number | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<number | null>(null);

  const [userId, setUserId] = useState("");
  const [consentType, setConsentType] = useState("data_processing");
  const [purpose, setPurpose] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const orgId = activeOrg?.id;

  const load = async () => {
    if (!orgId) return;
    try {
      const res = await consentApi.list(orgId);
      setConsents(res.data);
    } catch {
      toast.error("Failed to load consent records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [orgId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    setSubmitting(true);
    try {
      await consentApi.create(orgId, {
        user_identifier: userId,
        consent_type: consentType,
        purpose,
        expires_at: expiresAt || undefined,
      });
      toast.success("Consent record created — 1 ALGO anchoring on-chain (processing in background).");
      setShowForm(false);
      setUserId(""); setPurpose(""); setExpiresAt("");
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to create consent record");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnchor = async (consentId: number) => {
    if (!orgId) return;
    setAnchoring(consentId);
    try {
      await consentApi.anchor(orgId, consentId);
      toast.success("Consent hash anchored on Algorand.");
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Anchoring failed");
    } finally {
      setAnchoring(null);
    }
  };

  const handleRevoke = async () => {
    if (!orgId || confirmRevoke === null) return;
    try {
      await consentApi.revoke(orgId, confirmRevoke);
      toast.success("Consent record revoked.");
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Revocation failed");
    } finally {
      setConfirmRevoke(null);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in max-w-full overflow-hidden">
      <SectionHeader
        title="Consent Records"
        desc="DPDPA-compliant consent data — hashed before storage, anchored on Algorand."
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add consent
          </button>
        }
      />

      <ConfirmModal
        open={confirmRevoke !== null}
        title="Revoke consent"
        message="This will mark the consent as revoked. This action cannot be undone and may affect ongoing ZK proofs."
        confirmLabel="Revoke"
        destructive
        onConfirm={handleRevoke}
        onCancel={() => setConfirmRevoke(null)}
      />

      {/* Create form */}
      {showForm && (
        <div className="glass gradient-border p-4 sm:p-6 mb-6 animate-slide-up">
          <h3 className="text-sm font-display font-semibold text-white mb-2">New consent record</h3>
          <p className="text-xs text-slate-500 mb-4">Creating a record will tokenise <span className="text-indigo-400 font-semibold">1 ALGO</span> on-chain as proof.</p>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="input-label">User identifier</label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                className="input-field"
                placeholder="user@example.com or UUID (will be hashed)"
              />
            </div>
            <div>
              <label className="input-label">Consent type</label>
              <select
                value={consentType}
                onChange={(e) => setConsentType(e.target.value)}
                className="input-field"
              >
                {CONSENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="input-label">Purpose</label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                required
                minLength={10}
                className="input-field"
                placeholder="e.g. Processing user data for service delivery under DPDPA Section 7"
              />
            </div>
            <div>
              <label className="input-label">Expires at (optional)</label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="flex items-end gap-3 flex-wrap">
              <button type="submit" disabled={submitting} className="btn-primary whitespace-nowrap">
                {submitting ? "Anchoring on-chain..." : "Save & anchor (1 ALGO)"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full crypto-loader" />
        </div>
      ) : consents.length === 0 ? (
        <EmptyState
          icon={<Users className="w-10 h-10" />}
          title="No consent records yet"
          desc="Add your first consent record to begin building your compliance proof."
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden xl:block glass gradient-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {["User hash", "Type", "Purpose", "Granted", "Status", "On-chain", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {consents.map((c) => (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <HashDisplay hash={c.user_identifier_hash} />
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-xs capitalize whitespace-nowrap">
                        {c.consent_type.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs max-w-[220px] truncate">
                        {c.purpose}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {new Date(c.granted_at).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-4 py-3">
                        {c.is_anchored && c.txn_id ? (
                          <a
                            href={`https://lora.algokit.io/testnet/transaction/${c.txn_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 hover:text-emerald-300 rounded-lg text-[11px] transition-all duration-200 hover:shadow-[0_0_10px_rgba(16,185,129,0.1)] whitespace-nowrap"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View on Lora
                          </a>
                        ) : (
                          <span className="text-xs text-slate-600">Not anchored</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {!c.is_anchored && c.status === "active" && (
                            <button
                              onClick={() => handleAnchor(c.id)}
                              disabled={anchoring === c.id}
                              title="Anchor on Algorand"
                              className="p-1.5 text-slate-500 hover:text-indigo-400 disabled:opacity-40 transition-colors"
                            >
                              {anchoring === c.id
                                ? <div className="w-3.5 h-3.5 border border-indigo-400 border-t-transparent rounded-full crypto-loader" />
                                : <Anchor className="w-3.5 h-3.5" />
                              }
                            </button>
                          )}
                          {c.status === "active" && (
                            <button
                              onClick={() => setConfirmRevoke(c.id)}
                              title="Revoke consent"
                              className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile/tablet card layout */}
          <div className="xl:hidden space-y-3">
            {consents.map((c) => (
              <div key={c.id} className="glass gradient-border p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-medium text-slate-300 capitalize">
                        {c.consent_type.replace(/_/g, " ")}
                      </span>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="text-xs text-slate-500 truncate">{c.purpose}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!c.is_anchored && c.status === "active" && (
                      <button
                        onClick={() => handleAnchor(c.id)}
                        disabled={anchoring === c.id}
                        className="p-1.5 text-slate-500 hover:text-indigo-400 disabled:opacity-40 transition-colors"
                      >
                        {anchoring === c.id
                          ? <div className="w-3.5 h-3.5 border border-indigo-400 border-t-transparent rounded-full crypto-loader" />
                          : <Anchor className="w-3.5 h-3.5" />
                        }
                      </button>
                    )}
                    {c.status === "active" && (
                      <button
                        onClick={() => setConfirmRevoke(c.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-slate-600 mb-0.5">User hash</p>
                    <HashDisplay hash={c.user_identifier_hash} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-600 mb-0.5">Granted</p>
                    <p className="text-xs text-slate-400">{new Date(c.granted_at).toLocaleDateString("en-IN")}</p>
                  </div>
                </div>

                {c.is_anchored && c.txn_id && (
                  <a
                    href={`https://lora.algokit.io/testnet/transaction/${c.txn_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full px-3 py-2 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 hover:text-emerald-300 rounded-xl text-xs transition-all duration-200 hover:shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View on Lora Explorer
                  </a>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
