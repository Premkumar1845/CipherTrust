import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token if present
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("ct_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: { email: string; password: string; full_name: string; role?: string }) =>
    api.post("/auth/register", data),
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
};

// ─── Organizations ────────────────────────────────────────────────────────────

export const orgApi = {
  create: (name: string, wallet_address?: string) =>
    api.post("/orgs/", { name, wallet_address }),
  list: () => api.get("/orgs/"),
  get: (id: number) => api.get(`/orgs/${id}`),
  registerOnchain: (id: number, wallet_address: string) =>
    api.post(`/orgs/${id}/register-onchain`, { wallet_address }),
};

// ─── Consent ──────────────────────────────────────────────────────────────────

export const consentApi = {
  create: (orgId: number, data: {
    user_identifier: string;
    consent_type: string;
    purpose: string;
    expires_at?: string;
  }) => api.post(`/consent/${orgId}/records`, data),
  list: (orgId: number) => api.get(`/consent/${orgId}/records`),
  anchor: (orgId: number, consentId: number) =>
    api.post(`/consent/${orgId}/records/${consentId}/anchor`),
  revoke: (orgId: number, consentId: number) =>
    api.delete(`/consent/${orgId}/records/${consentId}`),
};

// ─── Proofs ───────────────────────────────────────────────────────────────────

export const proofApi = {
  generate: (orgId: number, consent_ids: number[], proof_type = "consent_compliance") =>
    api.post(`/proofs/${orgId}/generate`, { proof_type, consent_ids }),
  submit: (orgId: number, proofId: number) =>
    api.post(`/proofs/${orgId}/submit/${proofId}`),
  list: (orgId: number) => api.get(`/proofs/${orgId}`),
  get: (orgId: number, proofId: number) => api.get(`/proofs/${orgId}/${proofId}`),
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export const analyticsApi = {
  score:     (orgId: number) => api.get(`/analytics/${orgId}/score`),
  riskFlags: (orgId: number) => api.get(`/analytics/${orgId}/risk-flags`),
  trend:     (orgId: number, days = 30) => api.get(`/analytics/${orgId}/trend?days=${days}`),
  dashboard: (orgId: number) => api.get(`/analytics/${orgId}/dashboard`),
};

export const complianceApi = {
  summary: (orgId: number) => api.get(`/compliance/${orgId}/summary`),
  issueCertificate: (orgId: number, proof_id: number, regulation = "DPDPA") =>
    api.post(`/compliance/${orgId}/issue-certificate`, null, {
      params: { proof_id, regulation },
    }),
  certificates: (orgId: number) => api.get(`/compliance/${orgId}/certificates`),
  verifyByTxn: (txnId: string) => api.get(`/compliance/verify/${txnId}`),
};
