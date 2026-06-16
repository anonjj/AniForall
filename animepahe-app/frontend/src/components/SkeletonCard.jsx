export default function SkeletonCard() {
  return (
    <div className="relative flex flex-col w-full animate-pulse">
      <div className="relative aspect-[2/3] w-full bg-brandSurfaceMuted overflow-hidden rounded-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer-sweep animate-shimmer" />
      </div>
      <div className="mt-2 space-y-1.5">
        <div className="h-3 bg-brandSurfaceMuted rounded w-full" />
        <div className="h-3 bg-brandSurfaceMuted rounded w-2/3" />
      </div>
    </div>
  );
}
