"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Logo } from "@/components/logo";
import { Link, usePathname } from "@/i18n/navigation";

const NAV: {
  href: string;
  key:
    | "overview"
    | "orders"
    | "products"
    | "customers"
    | "analytics"
    | "inventory"
    | "activity"
    | "shipping"
    | "emails";
  icon: IconName;
  exact?: boolean;
}[] = [
  { href: "/admin", key: "overview", icon: "overview", exact: true },
  { href: "/admin/orders", key: "orders", icon: "orders" },
  { href: "/admin/products", key: "products", icon: "products" },
  { href: "/admin/customers", key: "customers", icon: "customers" },
  { href: "/admin/analytics", key: "analytics", icon: "analytics" },
  { href: "/admin/inventory", key: "inventory", icon: "inventory" },
  { href: "/admin/activity", key: "activity", icon: "activity" },
  { href: "/admin/shipping", key: "shipping", icon: "shipping" },
  { href: "/admin/emails", key: "emails", icon: "emails" },
];

export function AdminShell({
  name,
  role,
  logout,
  children,
}: {
  name: string;
  role: "ADMIN" | "VIEWER";
  logout: () => Promise<void>;
  children: React.ReactNode;
}) {
  const t = useTranslations("Admin.shell");
  const tc = useTranslations("Common");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  // close the drawer after navigating, and on Escape
  useEffect(() => {
    const t = setTimeout(() => setOpen(false), 0);
    return () => clearTimeout(t);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const nav = (
    <nav aria-label={t("navLabel")} className="flex flex-col gap-1 p-3">
      {NAV.map((n) => {
        const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
              active ? "bg-accent text-accent-fg" : "hover:bg-border"
            }`}
          >
            <Icon name={n.icon} />
            {t(`nav.${n.key}`)}
          </Link>
        );
      })}
      <Link href="/" className="mt-4 rounded-md px-3 py-2 text-sm text-muted hover:bg-border">
        {t("backToStore")}
      </Link>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-fg"
      >
        {t("skip")}
      </a>
      {/* desktop sidebar */}
      <aside className="hidden w-56 shrink-0 border-e border-border bg-card lg:block">
        <div className="border-b border-border p-4">
          <Logo />
        </div>
        {nav}
      </aside>

      {/* mobile drawer */}
      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={t("menu")}
        >
          <button
            type="button"
            aria-label={t("closeMenu")}
            className="absolute inset-0 bg-scrim"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 start-0 w-64 bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border p-4">
              <Logo />
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label={tc("close")}
              >
                <Icon name="close" />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-card px-4 py-3">
          <button
            type="button"
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "lg:hidden")}
            aria-label={t("openMenu")}
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Icon name="menu" />
          </button>
          {role === "VIEWER" && (
            <span className="rounded-full border border-warning px-3 py-0.5 text-xs text-warning">
              {t("viewerMode")}
            </span>
          )}
          <div className="ms-auto flex items-center gap-3 text-sm">
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="grid size-8 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-fg"
              >
                {name.trim().slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden sm:inline">{name}</span>
              <span className="hidden rounded-full border border-border px-2 py-0.5 text-xs text-muted sm:inline">
                {t(role === "ADMIN" ? "roleAdmin" : "roleViewer")}
              </span>
            </span>
            <LocaleSwitcher />
            <ThemeToggle />
            <form action={logout}>
              <button type="submit" className="hover:underline">
                {t("logout")}
              </button>
            </form>
          </div>
        </header>
        <div id="content" tabIndex={-1} className="flex-1 p-4 outline-none sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
