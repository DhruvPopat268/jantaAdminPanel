export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
          <div>
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mt-1"></div>
          </div>
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-64 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded">
                <div className="flex items-center gap-4">
                  <div className="h-4 w-8 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-12 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
