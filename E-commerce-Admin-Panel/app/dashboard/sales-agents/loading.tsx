import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="rounded-md border">
        <div className="p-4">
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-6 w-[80px]" />
              <Skeleton className="h-6 w-[150px]" />
              <Skeleton className="h-6 w-[150px]" />
              <Skeleton className="h-6 w-[150px]" />
              <Skeleton className="h-6 w-[80px]" />
              <Skeleton className="h-6 w-[100px]" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-6 w-[80px]" />
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-6 w-[100px]" />
                </div>
                <Skeleton className="h-12 w-[150px]" />
                <Skeleton className="h-12 w-[150px]" />
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
