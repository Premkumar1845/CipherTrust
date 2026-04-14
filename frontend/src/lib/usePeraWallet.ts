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
      }).catch(() => { });
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

  /**
   * Build a payment transaction using params from the backend, sign it
   * via Pera Wallet, and submit it to the Algorand network.
   * Returns the confirmed transaction ID.
   */
  const signAndSendPayment = useCallback(
    async (txnParams: {
      receiver: string;
      amount: number;
      note: string; // base64-encoded
      first_round: number;
      last_round: number;
      genesis_hash: string;
      genesis_id: string;
      fee: number;
    }): Promise<string> => {
      const addr = useStore.getState().walletAddress;
      if (!addr) throw new Error("Wallet not connected");

      const algosdk = await import("algosdk");
      const pera = await getPeraWallet();

      const suggestedParams: any = {
        flatFee: true,
        fee: txnParams.fee,
        firstRound: txnParams.first_round,
        lastRound: txnParams.last_round,
        genesisHash: txnParams.genesis_hash,
        genesisID: txnParams.genesis_id,
      };

      const noteBytes = Uint8Array.from(atob(txnParams.note), (c) => c.charCodeAt(0));

      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: addr,
        to: txnParams.receiver,
        amount: txnParams.amount,
        note: noteBytes,
        suggestedParams,
      });

      // Pera Wallet signing — returns array of signed txn Uint8Arrays
      const signedTxns = await pera.signTransaction([[{ txn }]]);

      // Submit to Algorand via public AlgoNode
      const algodClient = new algosdk.Algodv2(
        "",
        "https://testnet-api.4160.nodely.dev",
        ""
      );
      const { txId } = await algodClient.sendRawTransaction(signedTxns[0]).do();
      await algosdk.waitForConfirmation(algodClient, txId, 4);

      return txId;
    },
    []
  );

  return { walletAddress, connect, disconnect, isConnecting, error, signAndSendPayment };
}
