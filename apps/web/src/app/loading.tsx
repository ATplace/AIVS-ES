import { ProductGridSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="container-x space-y-12 py-8">
      <Skeleton className="h-72 w-full rounded-3xl lg:h-[480px]" />
      <ProductGridSkeleton />
    </div>
  );
}
