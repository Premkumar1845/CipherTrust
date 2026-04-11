import Link from "next/link";
import { Shield } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0f0f1a] text-slate-200 flex items-center justify-center">
      <div className="text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-6">
          <Shield className="w-7 h-7 text-indigo-400" />
        </div>
        <p className="font-mono text-6xl font-semibold text-indigo-400 mb-4">404</p>
        <h1 className="text-xl font-semibold text-white mb-2">Page not found</h1>
        <p className="text-sm text-slate-400 mb-8">
          This page doesn't exist or you don't have permission to view it.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Go to dashboard
          </Link>
          <Link
            href="/"
            className="px-5 py-2.5 border border-[#2a2a45] hover:border-indigo-500/30 text-slate-400 rounded-lg text-sm transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
