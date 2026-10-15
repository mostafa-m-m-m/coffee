import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { pinLocale } from "@/i18n/server";
import { db } from "@/lib/db";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/emails/[id]">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin.emails" });
  return { title: t("previewTitle") };
}

async function Preview({ params }: { params: PageProps<"/[locale]/admin/emails/[id]">["params"] }) {
  const { id } = await params;
  const t = await getTranslations("Admin.emails");
  const email = await db.emailLog.findUnique({ where: { id }, select: { to: true, html: true } });
  if (!email) notFound();
  return (
    <>
      <p className="text-muted" dir="ltr">
        {email.to}
      </p>
      {/* the stored HTML is rendered in a sandbox with no scripts, so nothing in it can touch the dashboard */}
      <iframe
        title={t("frameLabel")}
        sandbox=""
        srcDoc={email.html}
        className="h-[40rem] w-full rounded-lg border border-border bg-white"
      />
    </>
  );
}

export default async function EmailPreviewPage({
  params,
}: PageProps<"/[locale]/admin/emails/[id]">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin.emails" });
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">{t("previewTitle")}</h1>
      <Link href="/admin/emails" className="underline">
        {t("back")}
      </Link>
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-lg bg-border" aria-busy="true" />}
      >
        <Preview params={params} />
      </Suspense>
    </main>
  );
}
