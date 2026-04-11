"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "./store";

// Dynamic import to avoid SSR issues with Pera Wallet
let peraWallet: any = null;

async function getPeraWallet() {
  if (!peraWallet) {
    const { PeraWalletConnect } = await import("@perawallet/connect");
    peraWallet = new PeraWalletConnect({ shouldShowSignTxnToast: true } as any);
  }
  return peraWallet;
}

export function usePeraWallet() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { walletAddress, setWalletAddress } = useStore();

  // Reconnect on mount if session exists
  useEffect(() => {
    getPeraWallet().then((pera) => {
      pera.reconnectSession().then((accounts: string[]) => {
        if (accounts[0]) setWalletAddress(accounts[0]);
      }).catch(() => {});
    });
  }, [setWalletAddress]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const pera = await getPeraWallet();
      const accounts = await pera.connect();
      setWalletAddress(accounts[0]);
      return accounts[0];
    } catch (e: any) {
      setError(e?.message || "Connection failed");
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, [setWalletAddress]);

  const disconnect = useCallback(async () => {
    const pera = await getPeraWallet();
    await pera.disconnect();
    setWalletAddress(null);
  }, [setWalletAddress]);

  return { walletAddress, connect, disconnect, isConnecting, error };
}
