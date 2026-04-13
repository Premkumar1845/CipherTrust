import { Skeleton, StatCardSkeleton } from "@/components/ui/Skeleton";

export default function AnalyticsLoading() {
    return (
        <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="mb-6">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-3 w-64" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {Array.from({ length: 4 }).map((_, i) => (
                    <StatCardSkeleton key={i} />
                ))}
            </div>
            <div className="glass p-5 mb-8">
                <Skeleton className="h-3 w-32 mb-3" />
                <Skeleton className="h-2.5 w-full rounded-full" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="glass p-5"><Skeleton className="h-40 w-full rounded-xl" /></div>
                <div className="glass p-5"><Skeleton className="h-40 w-full rounded-xl" /></div>
            </div>
        </div>
    );
}
