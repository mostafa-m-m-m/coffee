"use client";

import { Icon } from "@/components/ui/icon";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Logo } from "@/components/logo";
import { useCart } from "@/hooks/use-cart";
import { useMounted } from "@/hooks/use-mounted";
import { Link, usePathname } from "@/i18n/navigation";
import { brand } from "@/lib/brand";

type Role = "CUSTOMER" | "ADMIN" | "VIEWER";

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Phone navigation: a ☰ button in the header opens a sheet from the start edge (right in RTL) with
 * the same links as the desktop header plus the theme switch. Esc / scrim / any link closes it,
 * focus is trapped inside while open and returns to the ☰ button afterwards.
 */
export function MobileMenu({
  user,
  logout,
}: {
  user: { role: Role } | null;
  logout: () => Promise<void>;
}) {
  const t = useTranslations("Store.nav");
  const tTheme = useTranslations("Common.theme");
  const tc = useTranslations("Common");
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const opener = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const mounted = useMounted();
  const count = useCart((s) => s.lines.reduce((n, l) => n + l.quantity, 0));
  const { resolvedTheme, setTheme } = useTheme();
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const button = opener.current;
    const nodes = () => [...(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    nodes()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return setOpen(false);
      if (e.key !== "Tab") return;
      const items = nodes();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // the page behind must not scroll

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
      button?.focus();
    };
  }, [open]);

  const isStaff = user?.role === "ADMIN" || user?.role === "VIEWER";
  const links: { href: string; label: string; badge?: number }[] = [
    { href: "/products", label: t("products") },
    { href: "/subscriptions", label: t("subscriptions") },
    { href: "/about", label: t("about") },
    { href: "/cart", label: t("cart"), badge: mounted ? count : 0 },
    user ? { href: "/account", label: t("account") } : { href: "/login", label: t("login") },
    ...(isStaff ? [{ href: "/admin", label: t("dashboard") }] : []),
  ];

  const row = "flex min-h-11 w-full items-center gap-2 px-4 text-start";

  return (
    <>
      <button
        ref={opener}
        type="button"
        aria-label={t("openMenu")}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen(true)}
        className="grid size-11 place-items-center rounded-md border border-border text-lg md:hidden"
      >
        <Icon name="menu" />
      </button>

      {open && (
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label={t("menu")}
          className="fixed inset-0 z-50 md:hidden"
        >
          <button
            type="button"
            aria-label={t("closeMenu")}
            tabIndex={-1}
            onClick={close}
            className="absolute inset-0 bg-scrim"
          />
          <div
            ref={panel}
            className="absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col border-e border-border bg-card shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border p-4">
              <Link href="/" onClick={close} aria-label={t("homeAria", { brand: brand.name })}>
                <Logo />
              </Link>
              <button
                type="button"
                onClick={close}
                aria-label={tc("close")}
                className="grid size-11 place-items-center rounded-md hover:bg-border"
              >
                <Icon name="close" />
              </button>
            </div>

            <nav aria-label={t("primary")} className="flex-1 overflow-y-auto py-2">
              {links.map((l) => {
                const active =
                  pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={close}
                    aria-current={active ? "page" : undefined}
                    className={`${row} border-s-4 ${
                      active
                        ? "border-accent bg-accent/10 font-semibold text-accent"
                        : "border-transparent hover:bg-border"
                    }`}
                  >
                    {l.label}
                    {!!l.badge && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-fg">
                        {l.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
              {user && (
                <form action={logout} onSubmit={close}>
                  <button
                    type="submit"
                    className={`${row} border-s-4 border-transparent hover:bg-border`}
                  >
                    {t("logout")}
                  </button>
                </form>
              )}
            </nav>

            <div className="flex items-center justify-between gap-3 border-t border-border p-4">
              <span className="text-sm text-muted">{tc("language.label")}</span>
              <LocaleSwitcher />
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border p-4">
              <span className="text-sm text-muted">{tTheme("label")}</span>
              <div
                role="group"
                aria-label={tTheme("label")}
                className="inline-flex rounded-md border border-border p-0.5"
              >
                {(
                  [
                    ["light", "sun"],
                    ["dark", "moon"],
                  ] as const
                ).map(([value, icon]) => {
                  const on = mounted && resolvedTheme === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={on}
                      aria-label={tTheme(value)}
                      onClick={() => setTheme(value)}
                      className={`grid h-9 w-11 place-items-center rounded ${
                        on ? "bg-accent text-accent-fg" : "hover:bg-border"
                      }`}
                    >
                      <Icon name={icon} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
