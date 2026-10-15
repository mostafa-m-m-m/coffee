import { cn } from "@/lib/cn";

export type TimelineItem = {
  id: string;
  /** what happened */
  title: React.ReactNode;
  /** who and when, shown under the title */
  meta?: React.ReactNode;
  /** a step that has not happened yet is drawn hollow and muted */
  done?: boolean;
};

/** Vertical list of events, oldest first: a dot per step joined by a line. */
export function Timeline({
  items,
  label,
  className,
}: {
  items: TimelineItem[];
  label: string;
  className?: string;
}) {
  return (
    <ol aria-label={label} className={cn("space-y-4", className)}>
      {items.map((item, i) => {
        const done = item.done ?? true;
        return (
          <li key={item.id} className="relative ps-6">
            {i < items.length - 1 && (
              <span
                aria-hidden
                className="absolute start-[0.4375rem] top-4 bottom-[-1rem] w-px bg-border"
              />
            )}
            <span
              aria-hidden
              className={cn(
                "absolute start-0 top-1.5 size-3.5 rounded-full border-2",
                done ? "border-accent bg-accent" : "border-border bg-card",
              )}
            />
            <p className={cn("text-sm", !done && "text-muted-foreground")}>{item.title}</p>
            {item.meta && <p className="text-xs text-muted-foreground">{item.meta}</p>}
          </li>
        );
      })}
    </ol>
  );
}
