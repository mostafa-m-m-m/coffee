"use client";

import { Icon } from "@/components/ui/icon";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/hooks/use-cart";
import { useMounted } from "@/hooks/use-mounted";

export function CartBadge() {
  const t = useTranslations("Store.nav");
  const count = useCart((s) => s.lines.reduce((n, l) => n + l.quantity, 0));
  // localStorage-backed state differs from the server render; show it only after mount
  const mounted = useMounted();

  return (
    <Link
      href="/cart"
      className="relative hover:underline"
      aria-label={t("cartLabel", { count: mounted ? count : 0 })}
    >
      <Icon name="cart" className="inline" />
      <span className="hidden sm:inline"> {t("cart")}</span>
      {mounted && count > 0 && (
        <span className="ms-1 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-fg">
          {count}
        </span>
      )}
    </Link>
  );
}
