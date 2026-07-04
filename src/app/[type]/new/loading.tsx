export default function CreateLoading() {
  return (
    <div className="p-6 flex flex-col gap-6 max-w-3xl mx-auto animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="h-4 w-40 rounded bg-rosely-cream/50" />

      {/* Title skeleton */}
      <div className="flex flex-col gap-2">
        <div className="h-8 w-56 rounded bg-rosely-cream/50" />
        <div className="h-4 w-80 rounded bg-rosely-cream/50" />
      </div>

      {/* Form skeleton */}
      <div className="flex flex-col gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-rosely-blush bg-card p-5 flex flex-col gap-4"
          >
            <div className="h-4 w-20 rounded bg-rosely-cream/50" />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex flex-col gap-1">
                  <div className="h-3 w-16 rounded bg-rosely-cream/50" />
                  <div className="h-9 w-full rounded-lg bg-rosely-cream/50" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
