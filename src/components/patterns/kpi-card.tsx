import { useFormatter, useTranslations } from "next-intl";
import { Sparkline } from "@/components/admin/sparkline";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

/**
 * A headline number with its change against the previous period (arrow, percent and a screen-reader
 * word, never color alone) and an optional trend line.
 */
export function KpiCard({
  label,
  value,
  change,
  trend,
}: {
  label: string;
  value: React.ReactNode;
  /** percent against the previous period; null when there is nothing to compare with */
  change: number | null;
  trend?: number[];
}) {
  const t = useTranslations("Admin.overview.kpi");
  const f = useFormatter();
  const up = change !== null && change > 0;
  const down = change !== null && change < 0;
  return (
    <Card className="p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold">{value}</p>
      {trend && <Sparkline values={trend} className="mt-2" />}
      <p
        className={cn(
          "mt-1 text-sm",
          up ? "text-success" : down ? "text-danger" : "text-muted-foreground",
        )}
      >
        {change === null ? (
          t("noPrevious")
        ) : (
          <>
            <span aria-hidden>{up ? "▲" : down ? "▼" : "–"}</span>{" "}
            <bdi dir="ltr">{t("percent", { value: f.number(Math.abs(change), "decimal") })}</bdi>{" "}
            {t("vsPrevious")}
            <span className="sr-only">
              {up ? ` (${t("increase")})` : down ? ` (${t("decrease")})` : ""}
            </span>
          </>
        )}
      </p>
    </Card>
  );
}
