"use client";

import { useEffect, useState, useCallback } from "react";
import { orgApi, complianceApi, analyticsApi } from "@/lib/api";
import { useStore } from "@/lib/store";

export function useOrg(orgId?: number) {
  const { activeOrg, setActiveOrg } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedId = orgId ?? activeOrg?.id;

  const load = useCallback(async () => {
    if (!resolvedId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await orgApi.get(resolvedId);
      setActiveOrg(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load organisation");
    } finally {
      setLoading(false);
    }
  }, [resolvedId]);

  useEffect(() => {
    if (resolvedId && (!activeOrg || activeOrg.id !== resolvedId)) {
      load();
    }
  }, [resolvedId]);

  return { org: activeOrg, loading, error, refresh: load };
}

export function useOrgList() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setActiveOrg, activeOrg } = useStore();

  useEffect(() => {
    orgApi
      .list()
      .then((res) => {
        setOrgs(res.data);
        // Auto-select first org if none active
        if (!activeOrg && res.data.length > 0) {
          setActiveOrg(res.data[0]);
        }
      })
      .catch((e) => setError(e?.response?.data?.detail || "Failed to load organisations"))
      .finally(() => setLoading(false));
  }, []);

  return { orgs, loading, error };
}

export function useCompliance(orgId?: number) {
  const resolvedId = orgId ?? useStore.getState().activeOrg?.id;
  const [summary, setSummary] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!resolvedId) return;
    setLoading(true);
    try {
      const [summaryRes, analyticsRes] = await Promise.all([
        complianceApi.summary(resolvedId),
        analyticsApi.dashboard(resolvedId),
      ]);
      setSummary(summaryRes.data);
      setAnalytics(analyticsRes.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load compliance data");
    } finally {
      setLoading(false);
    }
  }, [resolvedId]);

  useEffect(() => { load(); }, [resolvedId]);

  return { summary, analytics, loading, error, refresh: load };
}
