import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/**
 * One button for the whole product: pick a `variant` and a `size`, do not write button classes by
 * hand. `buttonVariants` returns the classes too, so a link can look like a button
 * (`<Link className={buttonVariants({ variant: "secondary" })}>`).
 */
export const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border font-medium whitespace-nowrap transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress aria-busy:opacity-70",
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-primary text-primary-foreground hover:bg-accent-hover active:brightness-95",
        secondary: "border-border bg-card text-foreground hover:bg-surface-2 active:brightness-95",
        ghost: "border-transparent bg-transparent text-foreground hover:bg-surface-2",
        danger:
          "border-transparent bg-danger text-danger-fg hover:brightness-110 active:brightness-95",
      },
      size: {
        sm: "min-h-9 px-3 text-sm",
        md: "px-4 text-sm",
        lg: "min-h-12 px-6 text-base",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Shows a busy state: the button keeps its size and stops accepting clicks. */
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  loading,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    />
  );
}
