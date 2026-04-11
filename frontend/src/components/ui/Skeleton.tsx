"use client";

import clsx from "clsx";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={clsx(
        "animate-pulse rounded-lg bg-white/[0.04]",
        className
      )}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="glass gradient-border p-5">
      <Skeleton className="h-3 w-24 mb-3" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className={clsx("h-3", i === 0 ? "w-24" : i === cols - 1 ? "w-12" : "w-20")} />
        </td>
      ))}
    </tr>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-16 w-16 rounded-full" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass p-5">
            <Skeleton className="h-4 w-36 mb-2" />
            <Skeleton className="h-3 w-48" />
          </div>
        ))}
      </div>
    </div>
  );
}
