import { FileTreeSkeleton } from "./FileTreeSkeleton"
import { FilePreviewSkeleton } from "./FilePreviewSkeleton"
import { HealthDashboardSkeleton } from "./HealthDashboardSkeleton"
import { MetricsDashboardSkeleton } from "./MetricsDashboardSkeleton"
import { StatisticsSkeleton } from "./StatisticsSkeleton"
import { Skeleton } from "@/components/ui/skeleton"

export function FileExplorerLoadingState() {
  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Skeleton className="h-9 w-64" />
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="md:col-span-1 space-y-6">
          <FileTreeSkeleton />

          {/* Import panel skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
              <div className="text-center space-y-2">
                <Skeleton className="h-12 w-12 mx-auto" />
                <Skeleton className="h-4 w-48 mx-auto" />
                <Skeleton className="h-3 w-32 mx-auto" />
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="md:col-span-2 space-y-6">
          <FilePreviewSkeleton />

          {/* Tabs skeleton */}
          <div className="space-y-4">
            <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-20" />
              ))}
            </div>
            <StatisticsSkeleton />
          </div>
        </div>
      </div>
    </div>
  )
}

export function AppLoadingState() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation skeleton */}
      <div className="border-b bg-white shadow-sm">
        <div className="container mx-auto">
          <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit max-w-lg">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-32" />
            ))}
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="p-4">
        <FileExplorerLoadingState />
      </div>
    </div>
  )
}

export { FileTreeSkeleton, FilePreviewSkeleton, HealthDashboardSkeleton, MetricsDashboardSkeleton, StatisticsSkeleton }
