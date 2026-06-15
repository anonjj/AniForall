export default function SkeletonCard() {
  return (
    <div className="relative flex flex-col bg-brandSurface border border-white/5 rounded-2xl overflow-hidden animate-pulse">
      {/* Poster Placeholder */}
      <div className="relative aspect-[3/4] w-full bg-brandSurfaceMuted overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer-sweep animate-shimmer" />
      </div>

      {/* Info Placeholder */}
      <div className="p-4 space-y-3">
        <div className="h-4 bg-brandSurfaceMuted rounded w-3/4" />
        <div className="h-3 bg-brandSurfaceMuted rounded w-1/2" />
      </div>
    </div>
  );
}
