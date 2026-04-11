"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, FileCheck,
  Key, Award, LogOut, WifiOff, BarChart2
} from "lucide-react";
import { useStore } from "@/lib/store";
import { usePeraWallet } from "@/lib/usePeraWallet";
import { AnimatedLogo } from "@/components/ui/AnimatedLogo";
import clsx from "clsx";

const orgLinks = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/dashboard/consent", icon: Users, label: "Consent Records" },
  { href: "/dashboard/proofs", icon: Key, label: "ZK Proofs" },
  { href: "/dashboard/certificates", icon: Award, label: "Certificates" },
  { href: "/dashboard/analytics", icon: BarChart2, label: "Analytics" },
];

const regLinks = [
  { href: "/regulator", icon: LayoutDashboard, label: "Regulator View" },
  { href: "/regulator/verify", icon: FileCheck, label: "Verify Proof" },
];

interface SidebarProps {
  mode: "org" | "regulator";
}

export function Sidebar({ mode }: SidebarProps) {
  const pathname = usePathname();
  const { logout, activeOrg } = useStore();
  const { walletAddress, connect, disconnect, isConnecting } = usePeraWallet();

  const links = mode === "org" ? orgLinks : regLinks;

  return (
    <aside className="glass-sidebar w-60 flex-shrink-0 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <AnimatedLogo size={32} />
          <div>
            <span className="font-display font-bold text-white text-sm tracking-tight">CipherTrust</span>
            {activeOrg && (
              <p className="text-[10px] text-slate-500 truncate max-w-[140px]">{activeOrg.name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-5 space-y-1">
        <p className="px-3 mb-3 text-[10px] font-semibold tracking-widest text-slate-600 uppercase">
          {mode === "org" ? "Platform" : "Regulator"}
        </p>
        {links.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200",
                active
                  ? "bg-gradient-to-r from-indigo-500/15 to-violet-500/10 text-white border border-indigo-500/20 shadow-[0_0_12px_rgba(99,102,241,0.08)]"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              <Icon className={clsx(
                "w-4 h-4 transition-colors",
                active ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"
              )} />
              <span className="font-medium">{label}</span>
              {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.6)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Wallet section */}
      <div className="px-3 py-4 border-t border-white/[0.06] space-y-2">
        {walletAddress ? (
          <div className="px-3 py-2.5 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/15">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.6)] animate-pulse-slow" />
              <span className="text-[11px] font-medium text-emerald-400">Wallet Connected</span>
            </div>
            <p className="text-[10px] font-mono text-slate-500 truncate">{walletAddress}</p>
            <button
              onClick={disconnect}
              className="text-[10px] text-slate-600 hover:text-red-400 mt-1.5 transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={connect}
            disabled={isConnecting}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/[0.08] hover:border-indigo-500/25 text-slate-400 hover:text-white text-xs transition-all duration-200 bg-white/[0.02] hover:bg-white/[0.04]"
          >
            <WifiOff className="w-3.5 h-3.5" />
            {isConnecting ? "Connecting..." : "Connect Pera Wallet"}
          </button>
        )}

        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-600 hover:text-red-400 text-xs transition-colors hover:bg-red-500/[0.05]"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
