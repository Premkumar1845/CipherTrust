"use client";

import { useEffect, useState } from "react";
import { Users, Plus, Anchor, Trash2 } from "lucide-react";
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

  // Form state
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
      toast.success("Consent record created — user identifier hashed and stored.");
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
    <div className="p-8 animate-fade-in">
      <SectionHeader
        title="Consent Records"
        desc="DPDPA-compliant consent data — hashed before storage, anchored on Algorand."
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-2"
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
        <div className="glass gradient-border p-6 mb-6 animate-slide-up">
          <h3 className="text-sm font-display font-semibold text-white mb-4">New consent record</h3>
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
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
              >
                {submitting ? "Saving..." : "Save record"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
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
        <div className="glass gradient-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["User hash", "Type", "Purpose", "Granted", "Status", "On-chain", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
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
                  <td className="px-4 py-3 text-slate-300 text-xs">
                    {c.consent_type.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs max-w-[200px] truncate">
                    {c.purpose}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(c.granted_at).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3">
                    {c.is_anchored ? (
                      <div className="glow-green inline-block"><HashDisplay hash={c.txn_id} label="Txn" /></div>
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
      )}
    </div>
  );
}
