"use client";

import { Icon } from "@/components/ui/icon";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useMounted } from "@/hooks/use-mounted";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const t = useTranslations("Common.theme");

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label={t("toggle")}
      className="grid size-9 place-items-center rounded-md hover:bg-border"
    >
      <Icon name={mounted ? (resolvedTheme === "dark" ? "sun" : "moon") : "system"} />
    </button>
  );
}
