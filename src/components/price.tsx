import { useFormatter } from "next-intl";
import { money } from "@/lib/format";

/**
 * A price. Isolated with `<bdi>` so the currency and digits keep their order when the surrounding
 * sentence runs in the other direction. Works in server and client components.
 */
export function Price({ cents, className }: { cents: number; className?: string }) {
  const f = useFormatter();
  return <bdi className={`font-mono ${className ?? ""}`.trim()}>{money(f, cents)}</bdi>;
}
