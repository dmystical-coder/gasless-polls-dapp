export const PollSkeleton = () => {
  return (
    <div className="card bg-base-100 shadow-xl border-2 border-base-300 animate-pulse">
      <div className="card-body">
        {/* Header skeleton */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 space-y-3">
            <div className="h-6 bg-base-300 rounded w-3/4 skeleton-loader" />
            <div className="flex gap-2">
              <div className="h-3 bg-base-300 rounded w-20 skeleton-loader" />
              <div className="h-3 bg-base-300 rounded w-20 skeleton-loader" />
            </div>
          </div>
          <div className="h-6 w-16 bg-base-300 rounded-full skeleton-loader" />
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-base-200 rounded-lg p-4">
            <div className="h-3 bg-base-300 rounded w-16 mb-2 skeleton-loader" />
            <div className="h-8 bg-base-300 rounded w-12 skeleton-loader" />
          </div>
          <div className="bg-base-200 rounded-lg p-4">
            <div className="h-3 bg-base-300 rounded w-16 mb-2 skeleton-loader" />
            <div className="h-8 bg-base-300 rounded w-12 skeleton-loader" />
          </div>
        </div>

        {/* Progress bars skeleton */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-4 bg-base-300 rounded w-32 skeleton-loader" />
            <div className="h-3 bg-base-300 rounded-full w-full skeleton-loader" />
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-base-300 rounded w-32 skeleton-loader" />
            <div className="h-3 bg-base-300 rounded-full w-full skeleton-loader" />
          </div>
        </div>

        {/* Buttons skeleton */}
        <div className="flex gap-3 mt-6">
          <div className="h-12 bg-base-300 rounded-lg flex-1 skeleton-loader" />
          <div className="h-12 bg-base-300 rounded-lg flex-1 skeleton-loader" />
        </div>
      </div>
    </div>
  );
};
