import { useTranslations } from "next-intl";
import { Header } from "@/components/store/header";
import { StoreFooter } from "@/components/store/footer";
import { Link } from "@/i18n/navigation";
import { pinLocale } from "@/i18n/server";

export default async function StoreLayout({ children, params }: LayoutProps<"/[locale]">) {
  await pinLocale(params);
  return <StoreFrame>{children}</StoreFrame>;
}

function StoreFrame({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Store.layout");
  return (
    <>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-fg"
      >
        {t("skip")}
      </a>
      <div className="bg-hero px-4 py-2 text-center text-sm text-hero-fg">
        {t("demoBar.text")}{" "}
        <Link href="/login" className="font-medium underline underline-offset-2">
          {t("demoBar.link")}
        </Link>
      </div>
      <Header />
      <div
        id="content"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 outline-none"
      >
        {children}
      </div>
      <StoreFooter />
    </>
  );
}
