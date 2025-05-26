import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function StatisticsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center">
          <Skeleton className="h-5 w-5 mr-2" />
          <Skeleton className="h-6 w-48" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-12" />
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {/* File Types skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-5 w-20" />
              <div className="space-y-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className="h-5 w-6" />
                  </div>
                ))}
              </div>
            </div>

            {/* Largest File skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-5 w-20" />
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
