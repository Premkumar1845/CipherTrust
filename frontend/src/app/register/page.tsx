"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight, Check } from "lucide-react";
import { authApi, orgApi } from "@/lib/api";
import { useStore } from "@/lib/store";
import { NetworkBackground } from "@/components/ui/NetworkBackground";
import { AnimatedLogo } from "@/components/ui/AnimatedLogo";

type Step = "account" | "org";

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useStore((s) => s.setAuth);
  const setActiveOrg = useStore((s) => s.setActiveOrg);

  const [step, setStep] = useState<Step>("account");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  // Account form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("org_admin");

  // Org form
  const [orgName, setOrgName] = useState("");

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authApi.register({ email, password, full_name: fullName, role });
      const loginRes = await authApi.login(email, password);
      const { access_token, user_id, role: userRole } = loginRes.data;
      setAuth(access_token, user_id, userRole);
      if (role === "regulator") {
        router.push("/regulator");
      } else {
        setStep("org");
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await orgApi.create(orgName);
      setActiveOrg(res.data);
      router.push("/dashboard");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to create organisation");
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
        <div className="absolute top-0 right-0 w-[400px] h-[300px] bg-violet-600/[0.04] rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <AnimatedLogo size={44} />
          <span className="font-display font-bold text-xl text-white tracking-tight">CipherTrust</span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          {(["account", "org"] as Step[]).map((s, i) => {
            const isActive = step === s;
            const isComplete = step === "org" && i === 0;
            return (
              <div key={s} className="flex items-center gap-2.5 flex-1">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono border transition-all duration-300 ${isComplete
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.1)]"
                    : isActive
                      ? "border-indigo-500/30 bg-indigo-500/15 text-indigo-300 shadow-[0_0_8px_rgba(99,102,241,0.1)]"
                      : "border-white/[0.06] text-slate-600"
                    }`}
                >
                  {isComplete ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-xs font-medium flex-1 ${isActive ? "text-slate-300" : "text-slate-600"}`}>
                  {s === "account" ? "Create account" : "Your organisation"}
                </span>
                {i === 0 && (
                  <div className={`h-px w-8 ${isComplete ? "bg-emerald-500/30" : "bg-white/[0.06]"} transition-colors`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="glass-strong gradient-border p-8 animate-scale-in">
          {step === "account" ? (
            <form onSubmit={handleAccountSubmit} className="space-y-5">
              <div>
                <h2 className="text-xl font-display font-bold text-white mb-1">Create your account</h2>
                <p className="text-sm text-slate-500">
                  Set up your CipherTrust access credentials.
                </p>
              </div>

              <div>
                <label className="input-label">Full name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="input-field"
                  placeholder="Priya Sharma"
                />
              </div>

              <div>
                <label className="input-label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-field"
                  placeholder="priya@acmecorp.in"
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
                    minLength={8}
                    className="input-field pr-10"
                    placeholder="Min. 8 characters"
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

              <div>
                <label className="input-label">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="input-field"
                >
                  <option value="org_admin">Organisation Admin</option>
                  <option value="regulator">Regulator / Auditor</option>
                </select>
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
                    Creating account...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-center text-xs text-slate-600">
                Already have an account?{" "}
                <Link href="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                  Sign in
                </Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handleOrgSubmit} className="space-y-5">
              <div>
                <h2 className="text-xl font-display font-bold text-white mb-1">Your organisation</h2>
                <p className="text-sm text-slate-500">
                  This will be registered as your compliance entity.
                </p>
              </div>

              <div>
                <label className="input-label">Organisation name</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                  className="input-field"
                  placeholder="Acme Corp Pvt Ltd"
                />
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
                    Setting up...
                  </>
                ) : (
                  <>
                    Launch dashboard
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
