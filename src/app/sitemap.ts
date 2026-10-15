import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/site";

const PAGES = ["", "/products", "/subscriptions", "/about", "/privacy", "/terms"] as const;

/** Every public page in every language, each entry pointing at its translation. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const products = await db.product.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true },
    orderBy: { slug: "asc" },
  });
  const paths = [
    ...PAGES.map((p) => ({ path: p, lastModified: undefined as Date | undefined })),
    ...products.map((p) => ({ path: `/products/${p.slug}`, lastModified: p.updatedAt })),
  ];
  return paths.flatMap(({ path, lastModified }) =>
    locales.map((l) => ({
      url: `${base}/${l}${path}`,
      lastModified,
      alternates: { languages: Object.fromEntries(locales.map((o) => [o, `${base}/${o}${path}`])) },
    })),
  );
}
