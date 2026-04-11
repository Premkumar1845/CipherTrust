import { create } from "zustand";

interface Org {
  id: number;
  name: string;
  did?: string;
  wallet_address?: string;
  is_registered_onchain: boolean;
  compliance_score: number;
}

interface AppState {
  // Auth
  token: string | null;
  userId: number | null;
  userRole: string | null;
  setAuth: (token: string, userId: number, role: string) => void;
  logout: () => void;

  // Active org
  activeOrg: Org | null;
  setActiveOrg: (org: Org) => void;

  // Wallet
  walletAddress: string | null;
  setWalletAddress: (addr: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  // Auth
  token: typeof window !== "undefined" ? localStorage.getItem("ct_token") : null,
  userId: null,
  userRole: null,
  setAuth: (token, userId, role) => {
    if (typeof window !== "undefined") localStorage.setItem("ct_token", token);
    set({ token, userId, userRole: role });
  },
  logout: () => {
    if (typeof window !== "undefined") localStorage.removeItem("ct_token");
    set({ token: null, userId: null, userRole: null, activeOrg: null });
  },

  // Active org
  activeOrg: null,
  setActiveOrg: (org) => set({ activeOrg: org }),

  // Wallet
  walletAddress: null,
  setWalletAddress: (addr) => set({ walletAddress: addr }),
}));
