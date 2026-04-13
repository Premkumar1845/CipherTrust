import { Skeleton } from "@/components/ui/Skeleton";

export default function ProofsLoading() {
    return (
        <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="mb-6">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-3 w-56" />
            </div>
            <div className="glass p-4 sm:p-6 mb-6">
                <Skeleton className="h-4 w-40 mb-4" />
                <div className="space-y-3">
                    <Skeleton className="h-10 w-full rounded-xl" />
                    <Skeleton className="h-10 w-32 rounded-xl" />
                </div>
            </div>
            <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="glass p-4">
                        <Skeleton className="h-4 w-48 mb-2" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                ))}
            </div>
        </div>
    );
}
