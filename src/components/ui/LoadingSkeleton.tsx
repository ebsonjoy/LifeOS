

export interface LoadingSkeletonProps {
  className?: string
  count?: number
}

export function LoadingSkeleton({ className = 'h-6 w-full', count = 1 }: LoadingSkeletonProps) {
  return (
    <div className="flex flex-col gap-2.5 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse rounded-xl bg-zinc-800/60 ${className}`}
        />
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 flex flex-col gap-4 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-4 w-1/3 bg-zinc-800 rounded-md" />
        <div className="h-8 w-8 bg-zinc-800 rounded-lg" />
      </div>
      <div className="h-8 w-1/2 bg-zinc-800 rounded-lg" />
      <div className="h-3 w-2/3 bg-zinc-800/60 rounded-md" />
    </div>
  )
}
