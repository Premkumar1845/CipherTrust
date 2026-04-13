import { Skeleton, StatCardSkeleton } from "@/components/ui/Skeleton";

export default function ConsentLoading() {
    return (
        <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <Skeleton className="h-6 w-48 mb-2" />
                    <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-10 w-40 rounded-xl" />
            </div>
            <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="glass p-4">
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-16 ml-auto" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
