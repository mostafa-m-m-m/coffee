import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { getTranslations } from "next-intl/server";
import { useFormatter, useTranslations } from "next-intl";
import { Suspense } from "react";
import { JsonLd } from "@/components/json-ld";
import { Logo } from "@/components/logo";
import { Price } from "@/components/price";
import { ProductCard, ProductGridSkeleton } from "@/components/store/product-card";
import { SubscribeForm } from "@/components/store/subscribe-form";
import { Link } from "@/i18n/navigation";
import { currentLocale, pinLocale } from "@/i18n/server";
import { brand } from "@/lib/brand";
import { FREE_SHIPPING_THRESHOLD_CENTS, ROAST_FRESH_DAYS } from "@/lib/config";
import { getBestSellers, listCategories } from "@/lib/services/products";
import { getDeliveryRange } from "@/lib/services/shipping";
import { siteUrl } from "@/lib/site";

async function BestSellers() {
  const items = await getBestSellers(await currentLocale(), 4);
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((p) => (
        <ProductCard key={p.id} p={p} quickAdd />
      ))}
    </div>
  );
}

async function Categories() {
  const categories = await listCategories(await currentLocale());
  return (
    <ul className="flex flex-wrap gap-3">
      {categories.map((c) => (
        <li key={c.id}>
          <Link
            href={`/products?category=${c.slug}`}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 hover:bg-border"
          >
            <span aria-hidden className="size-5 shrink-0">
              <Logo variant="mark" className="h-full! w-full!" />
            </span>
            {c.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  className: "size-5 shrink-0 text-accent",
} as const;

async function TrustStrip() {
  const t = await getTranslations("Store.home.trust");
  const delivery = await getDeliveryRange();
  return (
    <ul
      aria-label={t("label")}
      className="grid gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm sm:grid-cols-2 lg:grid-cols-4"
    >
      <li className="flex items-center justify-center gap-2">
        <svg {...iconProps}>
          <path d="M12 3c1 3 4 4.5 4 8.5A4 4 0 0 1 12 15.5a4 4 0 0 1-4-4c0-1.5.6-2.6 1.5-3.5.2 1 .8 1.6 1.5 1.8C11 7 11 5 12 3z" />
          <path d="M8 18.5c.8 1.4 2.3 2.5 4 2.5s3.2-1.1 4-2.5" />
        </svg>
        {t("fresh", { days: ROAST_FRESH_DAYS })}
      </li>
      <li className="flex items-center justify-center gap-2">
        <svg {...iconProps}>
          <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" />
          <circle cx="7" cy="17.5" r="1.5" />
          <circle cx="17" cy="17.5" r="1.5" />
        </svg>
        {t("delivery", delivery)}
      </li>
      <li className="flex items-center justify-center gap-2">
        <svg {...iconProps}>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M3 10h18" />
        </svg>
        {t("payment")}
      </li>
      <li className="flex items-center justify-center gap-2">
        <svg {...iconProps}>
          <path d="M20 12v8H4v-8M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z" />
        </svg>
        {t.rich("freeShipping", { amount: () => <Price cents={FREE_SHIPPING_THRESHOLD_CENTS} /> })}
      </li>
    </ul>
  );
}

function SectionHeading({
  id,
  children,
  href,
}: {
  id: string;
  children: React.ReactNode;
  href: string;
}) {
  const t = useTranslations("Store.home");
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h2 id={id} className="text-xl font-semibold">
        {children}
      </h2>
      <Link href={href} className="text-sm text-accent hover:underline">
        {t("viewAll")}
      </Link>
    </div>
  );
}

const STEPS = ["source", "roast", "deliver"] as const;
const TASTES = [
  { key: "fruity", roast: "LIGHT" },
  { key: "chocolatey", roast: "MEDIUM" },
  { key: "bold", roast: "DARK" },
] as const;
const REVIEWS = ["one", "two", "three"] as const;
const STARS = 5;

export default async function StoreHome({ params }: PageProps<"/[locale]">) {
  const locale = await pinLocale(params);
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: brand.name,
          url: `${siteUrl()}/${locale}`,
        }}
      />
      <HomeContent />
    </>
  );
}

function HomeContent() {
  const t = useTranslations("Store.home");
  const tRoast = useTranslations("Common.roast");
  const tFooter = useTranslations("Store.footer");
  const f = useFormatter();
  return (
    <main className="space-y-16">
      <section className="relative overflow-hidden rounded-2xl bg-hero px-6 py-14 text-hero-fg sm:px-10 sm:py-16">
        {/* ember glow + the logo's bean, decorative only */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_50%,color-mix(in_srgb,var(--accent)_30%,transparent),transparent_55%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute end-6 top-1/2 hidden h-52 w-52 -translate-y-1/2 sm:block lg:end-16 lg:h-64 lg:w-64"
        >
          <Logo variant="mark" mode="dark" className="h-full! w-full!" />
        </div>
        <div className="relative">
          <h1 className="text-3xl font-bold sm:text-4xl">{t("heroTitle")}</h1>
          <p className="mt-3 max-w-xl opacity-90">{t("heroSubtitle")}</p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link
              href="/products"
              className={cn(buttonVariants({ variant: "primary", size: "md" }))}
            >
              {t("browse")}
            </Link>
            <a href="#how" className="underline underline-offset-4">
              {t("heroSecondary")}
            </a>
          </div>
        </div>
      </section>

      <Suspense fallback={<div className="h-24 rounded-lg border border-border bg-card" />}>
        <TrustStrip />
      </Suspense>

      <section aria-labelledby="cats">
        <h2 id="cats" className="mb-4 text-xl font-semibold">
          {t("categories")}
        </h2>
        <Suspense fallback={<div className="h-10" />}>
          <Categories />
        </Suspense>
      </section>

      <section aria-labelledby="best">
        <SectionHeading id="best" href="/products">
          {t("bestSellers")}
        </SectionHeading>
        <Suspense fallback={<ProductGridSkeleton count={4} columns="grid-cols-2 lg:grid-cols-4" />}>
          <BestSellers />
        </Suspense>
      </section>

      <section id="how" aria-labelledby="how-title" className="scroll-mt-6">
        <h2 id="how-title" className="mb-6 text-xl font-semibold">
          {t("how.title")}
        </h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s} className="rounded-lg border border-border bg-card p-5">
              <span
                aria-hidden
                className="mb-3 flex size-9 items-center justify-center rounded-full bg-accent font-bold text-accent-fg"
              >
                {f.number(i + 1, "integer")}
              </span>
              <h3 className="font-semibold">{t(`how.steps.${s}.title`)}</h3>
              <p className="mt-1 text-sm text-muted">{t(`how.steps.${s}.text`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="taste">
        <h2 id="taste" className="mb-6 text-xl font-semibold">
          {t("taste.title")}
        </h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {TASTES.map(({ key, roast }) => (
            <li key={key}>
              <Link
                href={`/products?roast=${roast}`}
                className="group flex h-full flex-col rounded-lg border border-border bg-card p-5 transition hover:shadow-md"
              >
                <h3 className="font-semibold group-hover:underline">{t(`taste.${key}.title`)}</h3>
                <p className="mt-1 flex-1 text-sm text-muted">{t(`taste.${key}.text`)}</p>
                <span className="mt-4 text-sm text-accent">
                  {t("taste.cta", { roast: tRoast(roast) })} →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="subscription"
        className="flex flex-col items-start gap-4 rounded-2xl bg-hero px-6 py-10 text-hero-fg sm:px-10 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h2 id="subscription" className="text-xl font-semibold">
            {t("subscription.title")}
          </h2>
          <p className="mt-1 max-w-xl opacity-90">{t("subscription.text")}</p>
        </div>
        <Link href="/subscriptions" className={buttonVariants({ variant: "primary", size: "md" })}>
          {t("subscription.cta")}
        </Link>
      </section>

      <section aria-labelledby="reviews">
        <h2 id="reviews" className="text-xl font-semibold">
          {t("reviews.title")}
        </h2>
        <p className="mb-6 mt-1 text-sm text-muted">{t("reviews.demoNote")}</p>
        <ul className="grid gap-4 md:grid-cols-3">
          {REVIEWS.map((r) => (
            <li key={r} className="flex flex-col rounded-lg border border-border bg-card p-5">
              <p
                role="img"
                aria-label={t("reviews.rating", { count: STARS, max: STARS })}
                className="text-accent"
              >
                {"★".repeat(STARS)}
              </p>
              <blockquote className="mt-2 flex-1 text-sm">
                {t(`reviews.items.${r}.text`)}
              </blockquote>
              <p className="mt-3 text-sm font-medium">{t(`reviews.items.${r}.name`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="final"
        className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-12 text-center"
      >
        <h2 id="final" className="text-2xl font-bold">
          {t("finalCta.title")}
        </h2>
        <p className="max-w-lg text-muted">{t("finalCta.text")}</p>
        <SubscribeForm source="newsletter" />
        <Link href="/products" className="text-sm text-accent hover:underline">
          {tFooter("products")} →
        </Link>
      </section>
    </main>
  );
}
