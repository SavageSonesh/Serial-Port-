export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

export function ProjectCardSkeleton() {
  return (
    <div className="panel p-4">
      <Skeleton className="mb-3 h-32 w-full" />
      <Skeleton className="mb-2 h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function ClipCardSkeleton() {
  return (
    <div className="panel overflow-hidden">
      <Skeleton className="h-56 w-full rounded-none" />
      <div className="p-3">
        <Skeleton className="mb-2 h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}
