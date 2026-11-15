import { Card, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-4">
      <Skeleton className="h-6 w-40" />
      <Card className="space-y-4 p-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-3 w-full" />
      </Card>
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
  );
}
