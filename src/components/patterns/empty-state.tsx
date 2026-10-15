import { cn } from "@/lib/cn";

/** What a list or table shows when there is nothing in it: say why, and offer the way out. */
export function EmptyState({
  title,
  hint,
  action,
  className,
}: {
  title: string;
  hint?: string;
  /** a button or link that does something useful ("Clear filters", "Add the first product") */
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("rounded-2xl border border-dashed border-border p-10 text-center", className)}
    >
      <p className="font-medium">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
