import { cn } from "@/lib/cn";

/** The title block of a page: one h1, an optional line under it and actions on the end side. */
export function PageHeader({
  title,
  intro,
  actions,
  className,
}: {
  title: string;
  intro?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{title}</h1>
        {intro && <p className="text-muted-foreground">{intro}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
