"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Lock, FileCheck, Zap, ChevronRight, GitBranch, ArrowRight,
  Sparkles, Building2, HeartPulse, Globe2
} from "lucide-react";

const NetworkBackground = dynamic(() => import("@/components/ui/NetworkBackground").then((m) => m.NetworkBackground), { ssr: false });
const AnimatedLogo = dynamic(() => import("@/components/ui/AnimatedLogo").then((m) => m.AnimatedLogo), { ssr: false });

const features = [
  {
    icon: Lock,
    title: "Zero-Knowledge Proofs",
    desc: "Prove DPDPA compliance without exposing any personal data. Mathematical certainty, zero leakage.",
    accent: "from-indigo-500/20 to-indigo-500/5",
  },
  {
    icon: GitBranch,
    title: "Algorand Smart Contracts",
    desc: "Immutable consent registry and proof verification anchored on Algorand's fast, low-cost blockchain.",
    accent: "from-violet-500/20 to-violet-500/5",
  },
  {
    icon: FileCheck,
    title: "Verifiable Certificates",
    desc: "Compliance certificates issued as Algorand Standard Assets — shareable, unforgeable, on-chain.",
    accent: "from-cyan-500/20 to-cyan-500/5",
  },
  {
    icon: Zap,
    title: "Real-Time Verification",
    desc: "Regulators verify compliance in seconds, not weeks. No document submissions, no waiting.",
    accent: "from-emerald-500/20 to-emerald-500/5",
  },
];

const steps = [
  { n: "01", label: "Register org", desc: "On-chain DID via Identity contract" },
  { n: "02", label: "Log consent", desc: "Hashed records anchored on Algorand" },
  { n: "03", label: "Generate ZK proof", desc: "Circom circuit — no PII revealed" },
  { n: "04", label: "Submit on-chain", desc: "Proof hash verified by smart contract" },
  { n: "05", label: "Get certified", desc: "Regulator sees COMPLIANT ✓" },
];

const useCases = [
  {
    icon: Building2,
    title: "Fintech & Banking",
    desc: "Demonstrate KYC/AML compliance to regulators without exposing customer financial records. Ideal for NBFCs and digital lenders under RBI oversight.",
    tag: "DPDPA §4-7",
  },
  {
    icon: HeartPulse,
    title: "Healthcare & Pharma",
    desc: "Prove HIPAA-grade data handling for patient records. Generate ZK proofs that attest consent compliance without revealing any PHI.",
    tag: "DISHA Ready",
  },
  {
    icon: Globe2,
    title: "Web3 & DAOs",
    desc: "On-chain attestation of data governance for decentralised protocols. Verifiable compliance certificates as tradeable ASAs on Algorand.",
    tag: "Algorand Native",
  },
];

export default function Home() {
  const router = useRouter();
  const revealRef = useRef<HTMLDivElement>(null);

  // Redirect to wallet connection page
  useEffect(() => {
    router.replace("/connect");
  }, [router]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.12 }
    );
    revealRef.current?.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={revealRef} className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Particle network background */}
      <NetworkBackground nodeCount={25} className="fixed inset-0 z-0" />

      {/* Background glow orbs */}
      <div className="fixed inset-0 pointer-events-none z-[1]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-600/[0.07] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-violet-600/[0.05] rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-0 w-[400px] h-[300px] bg-cyan-500/[0.03] rounded-full blur-[80px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 glass-sidebar border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AnimatedLogo size={36} />
          <span className="font-display font-bold text-white tracking-tight text-lg">CipherTrust</span>
          <span className="text-[10px] px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 font-medium tracking-wider uppercase">
            BlockVeritas
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="btn-ghost">Org Portal</Link>
          <Link href="/regulator" className="btn-ghost">Regulator Portal</Link>
          <Link href="/register" className="btn-primary">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-28">
        <div className="relative">
          <div className="flex justify-center mb-8 animate-fade-in">
            <AnimatedLogo size={120} />
          </div>

          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full glass border-indigo-500/15 text-indigo-300 text-xs mb-8 animate-fade-in">
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse-glow" />
            <span className="font-medium">Live on Algorand TestNet</span>
            <Sparkles className="w-3 h-3 text-indigo-400/60" />
          </div>

          <h1 className="text-5xl md:text-7xl font-display font-extrabold text-white leading-[1.1] mb-7 max-w-4xl animate-slide-up tracking-tight">
            Prove Compliance.
            <br />
            <span className="gradient-text-animated">
              Preserve Privacy.
            </span>
          </h1>

          <p className="text-lg text-slate-400 max-w-xl mb-12 leading-relaxed mx-auto animate-slide-up">
            CipherTrust uses zero-knowledge proofs to let organisations demonstrate DPDPA
            compliance to regulators — without exposing a single record of personal data.
          </p>

          <div className="flex items-center justify-center gap-4 animate-slide-up">
            <Link
              href="/register"
              className="group btn-primary flex items-center gap-2 px-7 py-3.5 text-base"
            >
              Register your org
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/regulator"
              className="btn-secondary flex items-center gap-2 px-7 py-3.5 text-base"
            >
              Regulator view
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 py-20 max-w-5xl mx-auto w-full">
        <div className="text-center mb-14 reveal">
          <p className="text-[11px] text-indigo-400 font-semibold uppercase tracking-[0.2em] mb-3">
            How it works
          </p>
          <h2 className="text-3xl font-display font-bold text-white tracking-tight">
            Privacy-first compliance infrastructure
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {features.map(({ icon: Icon, title, desc, accent }, i) => (
            <div
              key={title}
              className={`glass gradient-border hover-glow p-6 relative overflow-hidden group reveal reveal-delay-${i + 1}`}
            >
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${accent} opacity-80`} />
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/15 to-violet-500/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Icon className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="font-display font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Use Cases */}
      <section className="relative z-10 px-6 py-20 max-w-5xl mx-auto w-full">
        <div className="text-center mb-14 reveal">
          <p className="text-[11px] text-indigo-400 font-semibold uppercase tracking-[0.2em] mb-3">
            Use cases
          </p>
          <h2 className="text-3xl font-display font-bold text-white tracking-tight">
            Built for regulated industries
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {useCases.map(({ icon: Icon, title, desc, tag }, i) => (
            <div
              key={title}
              className={`glass gradient-border hover-glow p-6 group reveal reveal-delay-${i + 1} relative`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-500/10 border border-indigo-500/15 flex items-center justify-center group-hover:shadow-glow-sm transition-all duration-300">
                  <Icon className="w-6 h-6 text-indigo-400" />
                </div>
                <span className="text-[9px] px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/15 font-mono font-medium tracking-wider uppercase">
                  {tag}
                </span>
              </div>
              <h3 className="font-display font-semibold text-white mb-2 text-lg">{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Demo Flow */}
      <section className="relative z-10 px-6 py-20 max-w-5xl mx-auto w-full">
        <div className="text-center mb-14 reveal">
          <p className="text-[11px] text-indigo-400 font-semibold uppercase tracking-[0.2em] mb-3">
            Core demo flow
          </p>
          <h2 className="text-3xl font-display font-bold text-white tracking-tight">
            From registration to certification
          </h2>
        </div>
        <div className="flex flex-col md:flex-row items-start gap-3 reveal reveal-delay-1">
          {steps.map((step, i) => (
            <div key={step.n} className="flex-1 flex flex-col items-center text-center group relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-500/10 border border-indigo-500/15 flex items-center justify-center text-indigo-400 font-mono text-xs mb-4 group-hover:shadow-glow-sm group-hover:scale-105 transition-all duration-300">
                {step.n}
              </div>
              <p className="font-display font-semibold text-white text-sm mb-1.5">{step.label}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
              {i < steps.length - 1 && (
                <ChevronRight className="hidden md:block absolute -right-2.5 top-5 w-4 h-4 text-slate-700" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] px-6 py-8 text-center text-xs text-slate-600">
        <div className="flex items-center justify-center gap-2 mb-2">
          <AnimatedLogo size={20} animate={false} />
          <span className="font-display font-semibold text-slate-500">CipherTrust</span>
        </div>
        Built on Algorand · Powered by ZK Proofs ·{" "}
        <span className="text-indigo-400/50">DPDPA Compliant Infrastructure</span>
      </footer>
    </div>
  );
}
