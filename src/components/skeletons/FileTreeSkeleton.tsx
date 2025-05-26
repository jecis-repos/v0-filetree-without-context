import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function FileTreeSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-1">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
        <div className="flex items-center space-x-2 mt-4">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-9" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Breadcrumbs skeleton */}
        <div className="px-4 py-2">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-3 w-3" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-3" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>

        {/* File tree skeleton */}
        <div className="h-[400px] p-2 space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <FileNodeSkeleton key={i} depth={Math.floor(Math.random() * 3)} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function FileNodeSkeleton({ depth = 0 }: { depth?: number }) {
  return (
    <div className="flex items-center py-1 px-2" style={{ paddingLeft: `${depth * 16 + 8}px` }}>
      <Skeleton className="h-4 w-4 mr-2" />
      <Skeleton className="h-4 flex-1 max-w-48" />
      <Skeleton className="h-3 w-12 ml-2" />
    </div>
  )
}
