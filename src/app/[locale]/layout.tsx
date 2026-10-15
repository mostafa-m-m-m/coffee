import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  Bricolage_Grotesque,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  IBM_Plex_Sans_Arabic,
} from "next/font/google";
import { notFound } from "next/navigation";
import { Providers } from "@/components/providers";
import { directions } from "@/i18n/config";
import { routing } from "@/i18n/routing";
import { brand, brandCss } from "@/lib/brand";
import { siteUrl } from "@/lib/site";
import "../globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "600"],
  // only English pages need it, and the browser fetches it when the first English text appears
  preload: false,
});
// numbers, prices and identifiers
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["500"],
  preload: false,
});
const arabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
  // regular and bold: medium and semibold text uses the nearest of the two
  weight: ["400", "700"],
});
// The wordmark's typeface (see public/logo-primary.svg), used for the brand name only.
const brandFont = Bricolage_Grotesque({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["700"],
  preload: false,
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: hasLocale(routing.locales, locale) ? locale : routing.defaultLocale,
    namespace: "Common.meta",
  });
  return {
    metadataBase: new URL(siteUrl()),
    openGraph: { siteName: brand.name, type: "website" },
    title: { default: `${brand.name} — ${t("tagline")}`, template: `%s | ${brand.shortName}` },
    description: t("description"),
    alternates: {
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}`])),
    },
  };
}

// browser UI (address bar on phones) follows the theme
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: brand.light.background },
    { media: "(prefers-color-scheme: dark)", color: brand.dark.background },
  ],
};

export default async function RootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const fontBody = locale === "ar" ? arabic.variable : plexSans.variable;
  return (
    <html
      lang={locale}
      dir={directions[locale]}
      className={`${fontBody} ${plexMono.variable} ${brandFont.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: brandCss() }} />
      </head>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
