import { useTranslations } from "next-intl";
import { Logo } from "@/components/logo";
import { Link } from "@/i18n/navigation";
import { brand } from "@/lib/brand";

const COLUMNS = [
  {
    title: "shop",
    links: [
      { href: "/products", label: "products" },
      { href: "/subscriptions", label: "subscriptions" },
    ],
  },
  { title: "company", links: [{ href: "/about", label: "about" }] },
  {
    title: "legal",
    links: [
      { href: "/privacy", label: "privacy" },
      { href: "/terms", label: "terms" },
    ],
  },
] as const;

export function StoreFooter() {
  const t = useTranslations("Store.footer");
  const tLayout = useTranslations("Store.layout");
  return (
    <footer className="border-t border-border py-10 text-sm text-muted">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div className="space-y-3">
          <Logo />
          <p>{tLayout("testMode")}</p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={t(col.title)}>
            <h2 className="mb-2 font-semibold text-foreground">{t(col.title)}</h2>
            <ul className="space-y-1">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-block py-1 hover:text-foreground hover:underline"
                  >
                    {t(l.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <p className="mx-auto mt-8 max-w-6xl px-4">{t("rights", { brand: brand.name })}</p>
    </footer>
  );
}
