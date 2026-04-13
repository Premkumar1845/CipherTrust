"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Wallet, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { usePeraWallet } from "@/lib/usePeraWallet";

const NetworkBackground = dynamic(() => import("@/components/ui/NetworkBackground").then((m) => m.NetworkBackground), { ssr: false });
const AnimatedLogo = dynamic(() => import("@/components/ui/AnimatedLogo").then((m) => m.AnimatedLogo), { ssr: false });

export default function ConnectWalletPage() {
    const router = useRouter();
    const { walletAddress, connect, disconnect, isConnecting, error } = usePeraWallet();
    const [showError, setShowError] = useState("");

    const handleConnect = async () => {
        setShowError("");
        const addr = await connect();
        if (addr) {
            // Small delay for UX feedback before redirect
            setTimeout(() => router.push("/login"), 800);
        }
    };

    const handleSkip = () => {
        router.push("/login");
    };

    const truncateAddr = (addr: string) =>
        `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    return (
        <div className="min-h-screen flex items-center justify-center px-4 relative">
            <NetworkBackground nodeCount={25} className="fixed inset-0 z-0" />

            {/* Glow orbs */}
            <div className="fixed inset-0 pointer-events-none z-[1]">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/[0.08] rounded-full blur-[150px]" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-violet-600/[0.05] rounded-full blur-[100px]" />
                <div className="absolute top-0 left-0 w-[400px] h-[300px] bg-cyan-500/[0.03] rounded-full blur-[80px]" />
            </div>

            <div className="relative z-10 w-full max-w-md text-center animate-fade-in">
                {/* Big Logo + Branding */}
                <div className="flex flex-col items-center mb-12">
                    <div className="mb-6 animate-scale-in">
                        <AnimatedLogo size={120} />
                    </div>
                    <h1 className="font-display font-extrabold text-4xl text-white tracking-tight mb-2">
                        CipherTrust
                    </h1>
                    <p className="text-sm text-indigo-400/80 font-medium tracking-wider uppercase">
                        BlockVeritas · Privacy-Preserving Compliance
                    </p>
                </div>

                {/* Connection Card */}
                <div className="glass-strong gradient-border p-8 animate-scale-in">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/10 border border-indigo-500/20 flex items-center justify-center">
                            <Wallet className="w-6 h-6 text-indigo-400" />
                        </div>
                    </div>

                    <h2 className="text-xl font-display font-bold text-white mb-1 mt-4">
                        Connect Your Wallet
                    </h2>
                    <p className="text-sm text-slate-500 mb-8">
                        Link your Algorand wallet to get started with CipherTrust.
                    </p>

                    {walletAddress ? (
                        /* Connected state */
                        <div className="space-y-5">
                            <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span className="text-sm text-emerald-300 font-medium">Wallet Connected</span>
                            </div>

                            <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Address</p>
                                <p className="text-sm text-white font-mono">{truncateAddr(walletAddress)}</p>
                            </div>

                            <button
                                onClick={() => router.push("/login")}
                                className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-base"
                            >
                                Continue to Sign In
                                <ArrowRight className="w-4 h-4" />
                            </button>

                            <button
                                onClick={disconnect}
                                className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
                            >
                                Disconnect wallet
                            </button>
                        </div>
                    ) : (
                        /* Disconnected state */
                        <div className="space-y-4">
                            {/* Pera Wallet button */}
                            <button
                                onClick={handleConnect}
                                disabled={isConnecting}
                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FFEE55]/90 to-[#FFEE55]/70 text-black font-semibold text-sm flex items-center justify-center gap-3 hover:from-[#FFEE55] hover:to-[#FFEE55]/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,238,85,0.15)]"
                            >
                                {isConnecting ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-black/40 border-t-transparent rounded-full animate-spin" />
                                        Connecting...
                                    </>
                                ) : (
                                    <>
                                        <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
                                            <rect width="40" height="40" rx="8" fill="black" />
                                            <path d="M28 14.5L22.5 20L28 25.5M12 14.5L17.5 20L12 25.5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        Connect Pera Wallet
                                    </>
                                )}
                            </button>

                            {(error || showError) && (
                                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/[0.08] border border-red-500/20">
                                    <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                                    <p className="text-xs text-red-400">{error || showError}</p>
                                </div>
                            )}

                            <div className="relative flex items-center gap-3 my-2">
                                <div className="flex-1 h-px bg-white/[0.06]" />
                                <span className="text-[10px] text-slate-600 uppercase tracking-wider">or</span>
                                <div className="flex-1 h-px bg-white/[0.06]" />
                            </div>

                            <button
                                onClick={handleSkip}
                                className="btn-secondary w-full py-3 flex items-center justify-center gap-2"
                            >
                                Skip for now
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Info footer */}
                <div className="mt-8 space-y-3">
                    <div className="flex items-center justify-center gap-4 text-[10px] text-slate-600">
                        <span className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                            Algorand TestNet
                        </span>
                        <span className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/50" />
                            Non-custodial
                        </span>
                        <span className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-violet-500/50" />
                            Zero-Knowledge
                        </span>
                    </div>
                    <p className="text-[10px] text-slate-700">
                        CipherTrust never stores your private keys. Wallet connection is read-only.
                    </p>
                </div>
            </div>
        </div>
    );
}
