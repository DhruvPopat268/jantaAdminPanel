import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="flex items-center space-x-2">
        <Skeleton className="h-10 flex-1" />
      </div>
      <div className="rounded-md border">
        <div className="p-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-6 w-[80px]" />
              <Skeleton className="h-6 flex-1" />
              <Skeleton className="h-6 w-[120px]" />
              <Skeleton className="h-6 w-[80px]" />
              <Skeleton className="h-6 w-[100px]" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-6 w-[80px]" />
                <Skeleton className="h-6 flex-1" />
                <Skeleton className="h-6 w-[120px]" />
                <Skeleton className="h-6 w-[80px]" />
                <Skeleton className="h-6 w-[100px]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
