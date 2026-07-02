import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingPageProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

export function LoadingPage({
  title = "Loading",
  subtitle = "Fetching the latest details",
  className,
}: LoadingPageProps) {
  return (
    <div className={cn("space-y-6", className)} aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <section className="bg-white border rounded-2xl p-5 space-y-4">
        <div>
          <p className="text-sm font-semibold text-text-on-light">{title}</p>
          <p className="text-xs text-text-muted-light">{subtitle}</p>
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-2/3" />
      </section>
    </div>
  );
}

export function LoadingSection({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-12 rounded-xl" />
      ))}
    </div>
  );
}
