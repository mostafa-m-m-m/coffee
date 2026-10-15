import { buttonVariants } from "@/components/ui/button";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Price } from "@/components/price";
import { Link } from "@/i18n/navigation";
import { QuickAdd } from "./quick-add";

type Item = {
  id?: string;
  name: string;
  slug: string;
  image: string | null;
  category: { name: string };
  origin?: string | null;
  tastingNotes?: string[];
  minPrice: number;
  maxPrice: number;
  inStock: boolean;
  quickAddVariantId?: string | null;
};

/**
 * `headingAs` keeps the document outline valid: h2 when the card sits directly under the page's h1.
 * The whole card is clickable through the title link (a stretched link), so a button inside it
 * ("Add to cart") is a real sibling control and not a button nested in a link.
 */
export function ProductCard({
  p,
  headingAs: Heading = "h3",
  quickAdd = false,
  priority = false,
}: {
  p: Item;
  headingAs?: "h2" | "h3";
  quickAdd?: boolean;
  /** the card is in the first screenful: load its image first (it is often the page's LCP element) */
  priority?: boolean;
}) {
  const t = useTranslations("Store.product");
  const tNotes = useTranslations("Common.tastingNotes");
  const notes = (p.tastingNotes ?? []).slice(0, 3);
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:shadow-md">
      <div className="relative aspect-square bg-border">
        {p.image && (
          <Image
            src={p.image}
            alt=""
            fill
            unoptimized
            priority={priority}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className={`object-cover ${p.inStock ? "" : "opacity-50 grayscale"}`}
          />
        )}
        {!p.inStock && (
          <span className="absolute start-2 top-2 rounded bg-foreground px-2 py-0.5 text-xs text-background">
            {t("soldOut")}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="text-xs text-muted">
          {[p.category.name, p.origin].filter(Boolean).join(" · ")}
        </span>
        <Heading className="font-medium">
          <Link
            href={`/products/${p.slug}`}
            className="after:absolute after:inset-0 group-hover:underline"
          >
            {p.name}
          </Link>
        </Heading>
        {notes.length > 0 && (
          <ul className="flex flex-wrap gap-1" aria-label={t("tastingNotes")}>
            {notes.map((n) => (
              <li
                key={n}
                className="rounded-full border border-border px-2 py-0.5 text-xs text-muted"
              >
                {tNotes.has(n as never) ? tNotes(n as never) : n}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-auto pt-2 text-sm">
          {p.minPrice === p.maxPrice ? (
            <Price cents={p.minPrice} />
          ) : (
            t.rich("priceFrom", { price: () => <Price cents={p.minPrice} /> })
          )}
        </p>
        {!p.inStock && (
          <span
            className={buttonVariants({
              variant: "secondary",
              size: "sm",
              className: "mt-1 w-full",
            })}
          >
            {t("notify")}
          </span>
        )}
        {quickAdd && p.inStock && p.quickAddVariantId && p.id && (
          <QuickAdd variantId={p.quickAddVariantId} productId={p.id} />
        )}
      </div>
    </div>
  );
}

/** Pass the same column classes as the real grid, otherwise the swap shifts the layout (CLS). */
export function ProductGridSkeleton({
  count = 8,
  columns = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
}: {
  count?: number;
  columns?: string;
}) {
  return (
    <div className={`grid gap-4 ${columns}`} aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-lg border border-border bg-card"
        >
          <div className="aspect-square bg-border" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-1/3 rounded bg-border" />
            <div className="h-4 w-3/4 rounded bg-border" />
            <div className="h-4 w-1/4 rounded bg-border" />
          </div>
        </div>
      ))}
    </div>
  );
}
