"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { localeCodes, localeNames, locales, type Locale } from "@/i18n/config";
import { usePathname, useRouter } from "@/i18n/navigation";

/**
 * Switches the language in place: same page, same query string, other locale prefix.
 * Each option is labelled in its own language and carries `lang`, so screen readers pronounce it correctly.
 */
export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const t = useTranslations("Common.language");
  const current = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, start] = useTransition();

  const go = (next: Locale) => {
    if (next === current) return;
    // read at click time: useSearchParams() would make every page that shows the header dynamic
    const qs = window.location.search;
    start(() => router.replace(`${pathname}${qs}`, { locale: next }));
  };

  return (
    <div
      role="group"
      aria-label={t("label")}
      aria-busy={pending}
      className={`inline-flex rounded-md border border-border p-0.5 ${className}`}
    >
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={l === current}
          aria-label={localeNames[l]}
          onClick={() => go(l)}
          className={`grid h-9 min-w-11 place-items-center rounded px-2 text-xs font-semibold ${
            l === current ? "bg-accent text-accent-fg" : "hover:bg-border"
          }`}
        >
          {localeCodes[l]}
        </button>
      ))}
    </div>
  );
}
