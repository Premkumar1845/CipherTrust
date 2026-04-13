import { Skeleton, StatCardSkeleton } from "@/components/ui/Skeleton";

export default function CertificatesLoading() {
    return (
        <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="mb-6">
                <Skeleton className="h-6 w-52 mb-2" />
                <Skeleton className="h-3 w-72" />
            </div>
            <div className="glass p-5 mb-6">
                <Skeleton className="h-4 w-40 mb-3" />
                <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full rounded-xl" />
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="glass p-5">
                        <Skeleton className="h-5 w-40 mb-3" />
                        <Skeleton className="h-3 w-32 mb-2" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                ))}
            </div>
        </div>
    );
}
