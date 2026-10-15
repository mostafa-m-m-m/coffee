import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Price } from "@/components/price";
import { ProductCard } from "@/components/store/product-card";
import { Tabs, type Tab } from "@/components/ui/tabs";
import { TrackEvent } from "@/components/store/track-event";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { currentLocale, pinLocale } from "@/i18n/server";
import { FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/config";
import { db } from "@/lib/db";
import { pick } from "@/lib/i18n/localized";
import { getRelatedProducts, getProductBySlug } from "@/lib/services/products";
import { listZones } from "@/lib/services/shipping";
import { ProductGallery } from "./product-gallery";
import { VariantPicker } from "./variant-picker";

export async function generateMetadata(props: PageProps<"/[locale]/products/[slug]">) {
  const { slug } = await props.params;
  const locale = await pinLocale(props.params);
  const p = await getProductBySlug(slug);
  const t = await getTranslations({ locale, namespace: "Store.product" });
  return {
    title: p ? pick(p.name, locale as "ar" | "en") : t("notFound"),
    description: p ? pick(p.description, locale as "ar" | "en") : undefined,
  };
}

type ProductData = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;

async function Product({ product }: { product: ProductData }) {
  const locale = await currentLocale();
  const t = await getTranslations("Store.product");
  const tNotes = await getTranslations("Common.tastingNotes");
  const tRoast = await getTranslations("Common.roast");
  const name = pick(product.name, locale);
  const [zones, related] = await Promise.all([
    listZones(),
    getRelatedProducts(product.slug, locale),
  ]);
  const cairo = zones.find((z) => z.governorates.includes("C"));

  const tabs: Tab[] = [
    {
      id: "description",
      label: t("tabs.description"),
      content: <p>{pick(product.description, locale)}</p>,
    },
    // a brewing guide only makes sense for coffee, which is what carries a roast level
    ...(product.roastLevel
      ? [
          {
            id: "brewing",
            label: t("tabs.brewing"),
            content: (
              <div className="space-y-2">
                <p className="text-muted">{t("brewing.intro")}</p>
                <ul className="list-disc space-y-1 ps-5">
                  <li>{t("brewing.espresso")}</li>
                  <li>{t("brewing.filter")}</li>
                  <li>{t("brewing.press")}</li>
                </ul>
                <p className="text-sm text-muted">{t("brewing.tip")}</p>
              </div>
            ),
          },
        ]
      : []),
    {
      id: "shipping",
      label: t("tabs.shipping"),
      content: (
        <div className="space-y-2">
          <p>{t("shippingTab.intro")}</p>
          <ul className="space-y-1">
            {zones.map((z) => (
              <li key={z.id}>
                {t.rich("shippingTab.row", {
                  zone: pick(z.name, locale),
                  days: z.etaDays,
                  fee: () => <Price cents={z.feeCents} />,
                })}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted">
            {t.rich("shippingTab.free", {
              amount: () => <Price cents={FREE_SHIPPING_THRESHOLD_CENTS} />,
            })}{" "}
            {t("shippingTab.cod")}
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-10">
      <nav aria-label={t("breadcrumb")} className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="underline">
              {t("home")}
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li>
            <Link
              href={{ pathname: "/products", query: { category: product.category.slug } }}
              className="underline"
            >
              {pick(product.category.name, locale)}
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li aria-current="page">{name}</li>
        </ol>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery images={product.images} name={name} />
        <div className="space-y-4">
          <p className="text-sm text-muted">{pick(product.category.name, locale)}</p>
          <h1 className="text-3xl font-bold">{name}</h1>
          {(product.origin || product.roastLevel || product.tastingNotes.length > 0) && (
            <div className="space-y-2 text-sm">
              <p className="text-muted">
                {[product.origin, product.roastLevel && tRoast(product.roastLevel)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {product.tastingNotes.length > 0 && (
                <ul aria-label={t("tastingNotes")} className="flex flex-wrap gap-2">
                  {product.tastingNotes.map((n) => (
                    <li key={n} className="rounded-full border border-border px-3 py-0.5">
                      {tNotes.has(n as never) ? tNotes(n as never) : n}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <TrackEvent type="PRODUCT_VIEW" productId={product.id} />
          <VariantPicker
            productId={product.id}
            productName={name}
            cairoDays={cairo?.etaDays}
            freeShippingCents={FREE_SHIPPING_THRESHOLD_CENTS}
            variants={product.variants.map((v) => ({
              id: v.id,
              name: pick(v.name, locale),
              priceCents: v.priceCents,
              stock: v.stock,
            }))}
          />
        </div>
      </div>

      <Tabs tabs={tabs} />

      {related.length > 0 && (
        <section aria-labelledby="related">
          <h2 id="related" className="mb-4 text-xl font-semibold">
            {t("related")}
          </h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// Blocking on purpose: the HTTP status has to be known before streaming starts, otherwise an
// unknown slug would answer 200 with a "not found" body. (No loading.tsx for the same reason.)
export const instant = false;

// Known products are prerendered; dashboard edits and sales revalidate them (see revalidateStore).
export async function generateStaticParams() {
  const rows = await db.product.findMany({ where: { isActive: true }, select: { slug: true } });
  return routing.locales.flatMap((locale) => rows.map((r) => ({ locale, slug: r.slug })));
}

export default async function ProductPage(props: PageProps<"/[locale]/products/[slug]">) {
  await pinLocale(props.params);
  const { slug } = await props.params;
  // looked up here, not in a child: notFound() must fire before anything streams so the status is 404
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  return (
    <main className="pb-24 md:pb-0">
      <Product product={product} />
    </main>
  );
}
