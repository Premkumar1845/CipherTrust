import { Sidebar } from "@/components/ui/Sidebar";

export default function RegulatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#0B1326]">
      <Sidebar mode="regulator" />
      <main className="flex-1 overflow-auto relative">
        {/* Subtle background glow */}
        <div className="fixed top-0 right-0 w-[500px] h-[400px] bg-violet-600/[0.03] rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
