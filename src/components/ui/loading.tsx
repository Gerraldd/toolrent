import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

export function LoadingSpinner({ className }: { className?: string }) {
    return (
        <div className={cn('flex items-center justify-center', className)}>
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        </div>
    )
}

export function LoadingPage() {
    return (
        <div className="flex min-h-[400px] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <LoadingSpinner />
                <p className="text-sm text-gray-500">Memuat...</p>
            </div>
        </div>
    )
}

export function LoadingCard() {
    return (
        <div className="rounded-lg border bg-white p-6">
            <div className="space-y-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
            </div>
        </div>
    )
}

export function LoadingTable({ rows = 5 }: { rows?: number }) {
    return (
        <div className="rounded-lg border bg-white">
            <div className="border-b p-4">
                <div className="flex gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-4 flex-1" />
                    ))}
                </div>
            </div>
            {Array.from({ length: rows }).map((_, index) => (
                <div key={index} className="border-b p-4 last:border-b-0">
                    <div className="flex gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} className="h-4 flex-1" />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

export function LoadingStats() {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-lg border bg-white p-6">
                    <div className="flex items-start justify-between">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-8 w-16" />
                        </div>
                        <Skeleton className="h-12 w-12 rounded-lg" />
                    </div>
                </div>
            ))}
        </div>
    )
}
