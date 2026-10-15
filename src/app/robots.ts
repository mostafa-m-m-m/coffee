import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { siteUrl } from "@/lib/site";

/** Crawlers see the storefront; the dashboard, API and payment pages are for people only. */
export default function robots(): MetadataRoute.Robots {
  const private_ = locales.flatMap((l) => [
    `/${l}/admin`,
    `/${l}/pay/`,
    `/${l}/account`,
    `/${l}/checkout`,
  ]);
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", ...private_] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
