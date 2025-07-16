export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-9 w-20 bg-gray-200 rounded animate-pulse"></div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="h-8 w-40 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-center space-x-2">
                  <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <div className="h-10 w-16 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 w-20 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
