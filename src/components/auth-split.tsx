import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/logo";
import type { Locale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { brand } from "@/lib/brand";

/**
 * Login and register share one frame: a brand panel on the left (hidden on phones) and the form on
 * the right with two tabs, "Log in" and "Sign up". The tabs are plain links, so each form keeps its own page.
 */
export async function AuthSplit({
  locale,
  active,
  title,
  children,
}: {
  locale: Locale;
  active: "login" | "register";
  title: string;
  children: React.ReactNode;
}) {
  const t = await getTranslations({ locale, namespace: "Auth.split" });
  const tc = await getTranslations({ locale, namespace: "Store.nav" });
  const tMeta = await getTranslations({ locale, namespace: "Common.meta" });
  return (
    <main className="grid min-h-screen md:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-accent p-10 text-accent-fg md:flex">
        <Link
          href="/"
          aria-label={tc("homeAria", { brand: brand.name })}
          className="flex items-center gap-3"
        >
          <Logo variant="mark" mode="dark" className="size-12" />
          <span className="text-2xl font-bold">{brand.name}</span>
        </Link>
        <div className="space-y-3">
          <p className="text-3xl leading-tight font-bold">{t("tagline")}</p>
          <p className="max-w-sm">{tMeta("tagline")}</p>
        </div>
        <p className="text-sm">{t("demoNote")}</p>
      </aside>
      <section className="mx-auto flex w-full max-w-sm flex-col justify-center gap-6 p-6">
        <Link
          href="/"
          aria-label={tc("homeAria", { brand: brand.name })}
          className="mx-auto md:hidden"
        >
          <Logo variant="stacked" />
        </Link>
        <nav
          aria-label={t("tabs")}
          className="grid grid-cols-2 rounded-lg border border-border p-1 text-center text-sm"
        >
          {(["login", "register"] as const).map((k) => (
            <Link
              key={k}
              href={`/${k}`}
              aria-current={k === active ? "page" : undefined}
              className={`rounded-md px-3 py-2 font-medium ${
                k === active ? "bg-accent text-accent-fg" : "text-muted"
              }`}
            >
              {t(k)}
            </Link>
          ))}
        </nav>
        <h1 className="text-2xl font-bold">{title}</h1>
        {children}
      </section>
    </main>
  );
}
