import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

/**
 * Soft status pill. The tone is never the only signal: pass an `icon` (a symbol) as well, so the
 * meaning survives for color-blind users and in forced-colors mode.
 */
export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "border-border bg-surface-2 text-muted-foreground",
        success: "border-success bg-success-soft text-success-ink",
        warning: "border-warning bg-warning-soft text-warning-ink",
        danger: "border-danger bg-danger-soft text-danger-ink",
        info: "border-info bg-info-soft text-info-ink",
        accent: "border-accent bg-card text-accent-ink",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  icon,
  children,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { icon?: IconName }) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {icon && <Icon name={icon} size={12} strokeWidth={2.25} />}
      {children}
    </span>
  );
}
