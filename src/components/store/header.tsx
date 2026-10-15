import { Icon } from "@/components/ui/icon";
import { getTranslations } from "next-intl/server";
import { useLocale, useTranslations } from "next-intl";
import { Suspense } from "react";
import { getSession } from "@/lib/session";
import { logoutAction } from "@/app/[locale]/(auth)/actions";
import { CartBadge } from "./cart-badge";
import { CartSync } from "./cart-sync";
import { MobileMenu } from "./mobile-menu";
import { Logo } from "@/components/logo";
import { LocaleSwitcher } from "../locale-switcher";
import { ThemeToggle } from "../theme-toggle";
import { Link } from "@/i18n/navigation";
import { brand } from "@/lib/brand";

const logout = logoutAction;

/** Desktop account links (hidden on phones, where the ☰ menu carries them). */
async function UserArea() {
  const session = await getSession();
  const user = session?.user;
  const t = await getTranslations("Store.nav");
  return (
    <>
      <CartSync loggedIn={!!user} />
      <div className="hidden items-center gap-4 md:flex">
        {user ? (
          <>
            {(user.role === "ADMIN" || user.role === "VIEWER") && (
              <Link href="/admin" className="hover:underline">
                {t("dashboard")}
              </Link>
            )}
            <Link href="/account" className="hover:underline">
              {t("account")}
            </Link>
            <form action={logout}>
              <button type="submit" className="hover:underline">
                {t("logout")}
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className="hover:underline">
            {t("login")}
          </Link>
        )}
      </div>
    </>
  );
}

async function MobileMenuGate() {
  const session = await getSession();
  return <MobileMenu user={session?.user ? { role: session.user.role } : null} logout={logout} />;
}

export function Header() {
  const t = useTranslations("Store.nav");
  const locale = useLocale();
  return (
    <header className="border-b border-border bg-card">
      <nav
        aria-label={t("primary")}
        className="mx-auto flex max-w-6xl items-center gap-5 px-4 py-3 text-sm"
      >
        <Link href="/" aria-label={brand.name} className="transition-opacity hover:opacity-90">
          <Logo />
        </Link>
        {(["products", "subscriptions", "about"] as const).map((key) => (
          <Link key={key} href={`/${key}`} className="hidden hover:underline md:inline">
            {t(key)}
          </Link>
        ))}
        <div className="ms-auto flex items-center gap-3 md:gap-4">
          <details className="group relative hidden md:block">
            <summary
              aria-label={t("search")}
              className="grid size-9 cursor-pointer list-none place-items-center rounded-md hover:bg-border"
            >
              <Icon name="search" />
            </summary>
            <form
              method="get"
              action={`/${locale}/products`}
              role="search"
              className="absolute end-0 top-full z-30 mt-2 w-72 rounded-lg border border-border bg-card p-3 shadow-lg"
            >
              <label htmlFor="nav-q" className="sr-only">
                {t("search")}
              </label>
              <input
                id="nav-q"
                name="q"
                type="search"
                placeholder={t("searchPlaceholder")}
                className="w-full rounded-md border border-border bg-background px-3 py-2"
              />
            </form>
          </details>
          <Suspense fallback={<span className="hidden h-5 w-16 md:block" />}>
            <UserArea />
          </Suspense>
          <div className="hidden items-center gap-3 md:flex">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
          <CartBadge />
          <Suspense fallback={<span className="size-11 md:hidden" />}>
            <MobileMenuGate />
          </Suspense>
        </div>
      </nav>
    </header>
  );
}
