import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { Logo } from "@/components/logo";
import { defaultLocale, directions, localeNames, locales } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { brand, brandCss } from "@/lib/brand";
import "./globals.css";

const arabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: `${messages[defaultLocale].Common.notFound.title} · ${brand.name}`,
  robots: { index: false },
};

/**
 * A URL that matches no route at all (e.g. /ar/a/b/c) answers 404 here. Next skips the layouts for
 * it, and with a `[locale]` root layout the language can't be known, so it speaks both.
 */
export default function GlobalNotFound() {
  return (
    <html lang={defaultLocale} dir={directions[defaultLocale]} className={arabic.variable}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: brandCss() }} />
      </head>
      <body className="min-h-screen">
        <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
          <div className="h-20 w-20" aria-hidden>
            <Logo variant="mark" className="h-full! w-full!" />
          </div>
          {locales.map((l) => {
            const t = messages[l].Common.notFound;
            return (
              <section key={l} lang={l} dir={directions[l]} className="space-y-2">
                <h1 className="text-2xl font-bold">{t.title}</h1>
                <p className="text-muted">{t.hint}</p>
                <a
                  href={`/${l}`}
                  className={cn(buttonVariants({ variant: "primary", size: "md" }))}
                >
                  {t.home} · {localeNames[l]}
                </a>
              </section>
            );
          })}
        </main>
      </body>
    </html>
  );
}
