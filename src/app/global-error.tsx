"use client";

import { defaultLocale, directions, isLocale } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { brand } from "@/lib/brand";

// Last-resort boundary (errors in the root layout itself). Must render its own <html>, and sits
// outside the intl provider, so it reads the locale from the URL and the catalog directly.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const first = typeof window === "undefined" ? "" : window.location.pathname.split("/")[1];
  const locale = isLocale(first) ? first : defaultLocale;
  const t = messages[locale].Common.error;
  return (
    <html lang={locale} dir={directions[locale]}>
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "4rem 1rem",
          background: brand.light.background,
          color: brand.light.foreground,
        }}
      >
        <h1>{t.title}</h1>
        <button onClick={reset} style={{ padding: "0.5rem 1rem", marginTop: "1rem" }}>
          {t.retry}
        </button>
      </body>
    </html>
  );
}
