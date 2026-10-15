import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { brand } from "@/lib/brand";
import { PAYMENT_SESSION_MINUTES, VAT_RATE } from "@/lib/config";

type Namespace = "about" | "privacy" | "terms";

/**
 * Text pages (About, Privacy, Terms) share one layout; every word comes from `Store.pages.<namespace>`.
 * `sections` lists the keys of that namespace's `sections` object, in reading order.
 */
export function InfoPage({
  namespace,
  sections,
  cta,
}: {
  namespace: Namespace;
  sections: readonly string[];
  cta?: { section: string; href: string };
}) {
  // the key shape differs per page, so the lookup is by dynamic key
  const t = useTranslations(`Store.pages.${namespace}` as "Store.pages.about");
  const text = t as unknown as (key: string, values?: Record<string, string | number>) => string;
  const has = (key: string) => (t as unknown as { has: (k: string) => boolean }).has(key);
  return (
    <main className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold">{text("title", { brand: brand.name })}</h1>
        {has("lead") && <p className="mt-2 text-lg text-muted">{text("lead")}</p>}
        {has("updated") && <p className="mt-2 text-sm text-muted">{text("updated")}</p>}
      </header>
      {sections.map((s) => (
        <section key={s} aria-labelledby={`s-${s}`}>
          <h2 id={`s-${s}`} className="text-xl font-semibold">
            {text(`sections.${s}.title`)}
          </h2>
          <p className="mt-2 leading-relaxed">
            {text(`sections.${s}.text`, {
              brand: brand.name,
              vat: Math.round(VAT_RATE * 100),
              minutes: PAYMENT_SESSION_MINUTES,
            })}
          </p>
          {cta?.section === s && (
            <Link
              href={cta.href}
              className={cn(
                buttonVariants({ variant: "primary", size: "md" }),
                "mt-4 inline-block",
              )}
            >
              {text(`sections.${s}.cta`)}
            </Link>
          )}
        </section>
      ))}
    </main>
  );
}
