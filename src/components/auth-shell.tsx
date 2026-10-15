import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/logo";
import type { Locale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { brand } from "@/lib/brand";

/** Frame of the small account pages (forgot / reset / verify): logo, title, then the page's content. */
export async function AuthShell({
  locale,
  title,
  children,
}: {
  locale: Locale;
  title: string;
  children: React.ReactNode;
}) {
  const tc = await getTranslations({ locale, namespace: "Store.nav" });
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <Link href="/" aria-label={tc("homeAria", { brand: brand.name })} className="mx-auto">
        <Logo variant="stacked" />
      </Link>
      <h1 className="text-2xl font-bold">{title}</h1>
      {children}
    </main>
  );
}
