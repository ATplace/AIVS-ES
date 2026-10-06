import { ProductGridSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="container-x py-6 sm:py-10">
      <Skeleton className="h-9 w-48" />
      <div className="mt-6 flex gap-10">
        <div className="hidden w-56 shrink-0 space-y-3 lg:block">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
        <div className="flex-1 space-y-5">
          <Skeleton className="h-9 w-full" />
          <ProductGridSkeleton count={12} />
        </div>
      </div>
    </div>
  );
}
