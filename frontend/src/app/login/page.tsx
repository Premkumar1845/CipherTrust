"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { authApi } from "@/lib/api";
import { useStore } from "@/lib/store";
import { NetworkBackground } from "@/components/ui/NetworkBackground";
import { AnimatedLogo } from "@/components/ui/AnimatedLogo";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useStore((s) => s.setAuth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await authApi.login(email, password);
      const { access_token, user_id, role } = res.data;
      setAuth(access_token, user_id, role);
      if (role === "regulator" || role === "auditor") {
        router.push("/regulator");
      } else {
        router.push("/dashboard");
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <NetworkBackground nodeCount={35} className="fixed inset-0 z-0" />
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none z-[1]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/[0.06] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-violet-600/[0.04] rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <AnimatedLogo size={44} />
          <span className="font-display font-bold text-xl text-white tracking-tight">CipherTrust</span>
        </div>

        <div className="glass-strong gradient-border p-8 animate-scale-in">
          <h2 className="text-xl font-display font-bold text-white mb-1">Welcome back</h2>
          <p className="text-sm text-slate-500 mb-7">
            Access your compliance dashboard.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="input-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="input-field"
                placeholder="admin@acmecorp.in"
              />
            </div>

            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input-field pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/[0.08] border border-red-500/20 rounded-xl px-4 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full crypto-loader mr-2" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-7 p-4 rounded-xl bg-indigo-500/[0.04] border border-indigo-500/10">
            <p className="text-[11px] text-slate-500 font-semibold mb-2 uppercase tracking-wider">Demo credentials</p>
            <div className="space-y-1.5">
              <p className="text-[11px] text-slate-600 font-mono">admin@acmecorp.in / password123</p>
              <p className="text-[11px] text-slate-600 font-mono">regulator@dpdpa.gov.in / password123</p>
            </div>
          </div>

          <p className="text-center text-xs text-slate-600 mt-7">
            No account?{" "}
            <Link href="/register" className="text-indigo-400 hover:text-indigo-300 transition-colors">
              Register your organisation
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
