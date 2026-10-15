import { buttonVariants } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/logo";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("Common.notFound");
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="h-20 w-20" aria-hidden>
        <Logo variant="mark" className="h-full! w-full!" />
      </div>
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted">{t("hint")}</p>
      <div className="flex gap-3">
        <Link href="/products" className={buttonVariants({ variant: "primary", size: "md" })}>
          {t("browse")}
        </Link>
        <Link href="/" className={buttonVariants({ variant: "secondary", size: "md" })}>
          {t("home")}
        </Link>
      </div>
    </main>
  );
}
