"use client";

import { useTranslations } from "next-intl";
import { ErrorView } from "@/components/error-view";

export default function AdminError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Admin.shell.nav");
  return <ErrorView {...props} home={{ href: "/admin", label: t("overview") }} />;
}
