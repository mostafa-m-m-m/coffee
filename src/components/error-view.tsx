"use client";

import { buttonVariants } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/logo";
import { Link } from "@/i18n/navigation";

/** Shared body for route-level error boundaries: say what happened, offer a retry and a way out. */
export function ErrorView({
  error,
  reset,
  home,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  home?: { href: string; label: string };
}) {
  const t = useTranslations("Common.error");
  const target = home ?? { href: "/", label: t("home") };
  return (
    <div role="alert" className="mx-auto max-w-md space-y-4 py-16 text-center">
      <div className="mx-auto h-16 w-16" aria-hidden>
        <Logo variant="mark" className="h-full! w-full!" />
      </div>
      <h1 className="text-xl font-bold">{t("title")}</h1>
      <p className="text-sm text-muted">
        {t("hint")}
        {error.digest && (
          <span className="block pt-1 font-mono text-xs">{t("code", { code: error.digest })}</span>
        )}
      </p>
      <div className="flex justify-center gap-3">
        <button onClick={reset} className={buttonVariants({ variant: "primary", size: "md" })}>
          {t("retry")}
        </button>
        <Link href={target.href} className={buttonVariants({ variant: "secondary", size: "md" })}>
          {target.label}
        </Link>
      </div>
    </div>
  );
}
