export default function DetailLoading() {
  return (
    <div className="p-6 flex flex-col gap-6 max-w-5xl mx-auto animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="h-4 w-48 rounded bg-rosely-cream/50" />

      {/* Title skeleton */}
      <div className="flex flex-col gap-2">
        <div className="h-8 w-64 rounded bg-rosely-cream/50" />
        <div className="h-4 w-96 rounded bg-rosely-cream/50" />
        <div className="flex gap-2 mt-2">
          <div className="h-6 w-16 rounded-full bg-rosely-cream/50" />
          <div className="h-6 w-20 rounded-full bg-rosely-cream/50" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-6 border-b border-rosely-blush pb-2">
        <div className="h-4 w-16 rounded bg-rosely-cream/50" />
        <div className="h-4 w-28 rounded bg-rosely-cream/50" />
        <div className="h-4 w-24 rounded bg-rosely-cream/50" />
      </div>

      {/* Content skeleton */}
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-rosely-blush bg-card p-5 flex flex-col gap-4">
          <div className="h-4 w-24 rounded bg-rosely-cream/50" />
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="h-3 w-20 rounded bg-rosely-cream/50" />
                <div className="h-5 w-32 rounded bg-rosely-cream/50" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
