import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const control =
  "rounded-xl border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60";

export const inputVariants = cva(control, {
  variants: {
    invalid: { true: "border-danger", false: "border-border" },
    size: { md: "min-h-11", sm: "min-h-9" },
  },
  defaultVariants: { invalid: false, size: "md" },
});

type Variants = VariantProps<typeof inputVariants>;

export function Input({
  className,
  invalid,
  size,
  ...props
}: Omit<ComponentProps<"input">, "size"> & Variants) {
  return (
    <input
      className={cn(inputVariants({ invalid, size }), className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function Textarea({ className, invalid, ...props }: ComponentProps<"textarea"> & Variants) {
  return (
    <textarea
      className={cn(inputVariants({ invalid }), "min-h-24", className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function Select({
  className,
  invalid,
  size,
  children,
  ...props
}: Omit<ComponentProps<"select">, "size"> & Variants) {
  return (
    <select
      className={cn(inputVariants({ invalid, size }), className)}
      aria-invalid={invalid || undefined}
      {...props}
    >
      {children}
    </select>
  );
}

/**
 * A labelled form control with its hint and error: the label is tied to the control by `htmlFor`
 * and the message is announced (`role="alert"`) when it appears.
 */
export function Field({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  /** the control, which must carry `id` */
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
