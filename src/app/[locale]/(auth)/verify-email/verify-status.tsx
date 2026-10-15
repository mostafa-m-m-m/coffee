"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";

/** Spends the link from the page (not on the GET), so a mail scanner that only fetches the URL can't use it up. */
export function VerifyStatus() {
  const t = useTranslations("Auth.verify");
  const token = useSearchParams().get("token");
  const [state, setState] = useState<"working" | "done" | "failed">(token ? "working" : "failed");
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true; // React runs effects twice in development; the link works once
    fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => setState(r.ok ? "done" : "failed"))
      .catch(() => setState("failed"));
  }, [token]);

  if (state === "working") {
    return (
      <p role="status" aria-busy="true" className="h-6 w-40 animate-pulse rounded bg-border" />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p
        role={state === "done" ? "status" : "alert"}
        className={state === "failed" ? "text-danger" : undefined}
      >
        {t(state)}
      </p>
      <Link href="/account" className="underline">
        {t("toAccount")}
      </Link>
    </div>
  );
}
