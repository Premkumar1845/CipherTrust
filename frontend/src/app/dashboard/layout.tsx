"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/ui/Sidebar";
import { useStore } from "@/lib/store";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const token = useStore((s) => s.token);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!token && typeof window !== "undefined" && !localStorage.getItem("ct_token")) {
      router.replace("/login");
    }
  }, [token, router]);

  return (
    <div className="flex min-h-screen bg-[#0B1326]">
      <Sidebar mode="org" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 overflow-auto relative min-w-0">
        {/* Mobile header bar */}
        <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 lg:hidden bg-[#0B1326]/80 backdrop-blur-md border-b border-white/[0.06]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-display font-bold text-white text-sm">CipherTrust</span>
        </div>
        {/* Subtle background glow */}
        <div className="fixed top-0 right-0 w-[500px] h-[400px] bg-indigo-600/[0.03] rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
