"use client";

import { useEffect, useState } from "react";
import { Users, Plus, Anchor, Trash2, ExternalLink, Paperclip } from "lucide-react";
import { consentApi } from "@/lib/api";
import { useStore } from "@/lib/store";
import { usePeraWallet } from "@/lib/usePeraWallet";
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
  const { walletAddress, connect, signAndSendPayment } = usePeraWallet();
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
  const [document, setDocument] = useState<File | null>(null);

  const orgId = activeOrg?.id;

  const load = async () => {
    if (!orgId) return;
    try {
      const res = await consentApi.list(orgId);
      setConsents(res.data.filter((c: any) => c.status !== "revoked"));
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

    // Ensure wallet is connected before proceeding
    let addr = walletAddress;
    if (!addr) {
      toast.info("Please connect your Pera Wallet to sign the transaction.");
      addr = await connect();
      if (!addr) {
        toast.error("Wallet connection required to tokenise consent on-chain.");
        return;
      }
    }

    setSubmitting(true);
    try {
      // 1. Create consent record in the database (no blockchain yet)
      const createRes = await consentApi.create(orgId, {
        user_identifier: userId,
        consent_type: consentType,
        purpose,
        expires_at: expiresAt || undefined,
        document: document || undefined,
      });
      const consentId = createRes.data.id;

      toast.info("Consent record saved. Please approve the 1 ALGO transaction in Pera Wallet...");

      // 2. Get transaction parameters from backend
      const txnRes = await consentApi.buildAnchorTxn(orgId, consentId);
      const txnParams = txnRes.data;

      // 3. Sign via Pera Wallet (user must approve)
      const txnId = await signAndSendPayment(txnParams);

      // 4. Confirm the anchor on backend
      await consentApi.confirmAnchor(orgId, consentId, txnId);

      toast.success("Consent tokenised on Algorand! 1 ALGO anchored on-chain.");
      setShowForm(false);
      setUserId(""); setPurpose(""); setExpiresAt(""); setDocument(null);
      await load();
    } catch (e: any) {
      if (e?.message?.includes("rejected") || e?.message?.includes("cancelled")) {
        toast.error("Transaction cancelled — consent record saved but not anchored.");
      } else {
        toast.error(e?.response?.data?.detail || e?.message || "Failed to create consent record");
      }
      await load(); // reload to show unanchored record
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnchor = async (consentId: number) => {
    if (!orgId) return;

    // Ensure wallet is connected
    let addr = walletAddress;
    if (!addr) {
      toast.info("Please connect your Pera Wallet to sign the transaction.");
      addr = await connect();
      if (!addr) {
        toast.error("Wallet connection required to anchor on-chain.");
        return;
      }
    }

    setAnchoring(consentId);
    try {
      // 1. Build transaction params from backend
      const txnRes = await consentApi.buildAnchorTxn(orgId, consentId);
      const txnParams = txnRes.data;

      toast.info("Please approve the 1 ALGO transaction in Pera Wallet...");

      // 2. Sign via Pera Wallet
      const txnId = await signAndSendPayment(txnParams);

      // 3. Confirm on backend
      await consentApi.confirmAnchor(orgId, consentId, txnId);

      toast.success("Consent hash anchored on Algorand.");
      await load();
    } catch (e: any) {
      if (e?.message?.includes("rejected") || e?.message?.includes("cancelled")) {
        toast.error("Transaction cancelled by user.");
      } else {
        toast.error(e?.response?.data?.detail || e?.message || "Anchoring failed");
      }
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
          <p className="text-xs text-slate-500 mb-4">Creating a record will prompt your <span className="text-indigo-400 font-semibold">Pera Wallet</span> to approve a <span className="text-indigo-400 font-semibold">1 ALGO</span> on-chain transaction.</p>
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
            <div className="md:col-span-2">
              <label className="input-label">Supporting document (optional)</label>
              <div className="relative">
                <input
                  type="file"
                  onChange={(e) => setDocument(e.target.files?.[0] || null)}
                  className="input-field file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-500/20 file:text-indigo-400 hover:file:bg-indigo-500/30 file:cursor-pointer"
                />
                {document && (
                  <p className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
                    <Paperclip className="w-3 h-3" />
                    {document.name} ({(document.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-end gap-3 flex-wrap md:col-span-2">
              <button type="submit" disabled={submitting} className="btn-primary whitespace-nowrap">
                {submitting ? "Waiting for Pera approval..." : "Save & anchor (1 ALGO)"}
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
                    {["User hash", "Type", "Purpose", "Doc", "Granted", "Status", "On-chain", "Actions"].map((h) => (
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
                      <td className="px-4 py-3">
                        {c.document_name ? (
                          <span className="inline-flex items-center gap-1 text-xs text-indigo-400" title={`SHA-256: ${c.document_hash}`}>
                            <Paperclip className="w-3 h-3" />
                            <span className="max-w-[100px] truncate">{c.document_name}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
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
                  {c.document_name && (
                    <div className="col-span-2">
                      <p className="text-[10px] text-slate-600 mb-0.5">Document</p>
                      <span className="inline-flex items-center gap-1 text-xs text-indigo-400" title={`SHA-256: ${c.document_hash}`}>
                        <Paperclip className="w-3 h-3" />
                        {c.document_name}
                      </span>
                    </div>
                  )}
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
