import { cn } from "@lib/utils";

function Skeleton({ className, active, paragraph, ...props }) {
  return <div data-slot="skeleton" className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

export { Skeleton };
