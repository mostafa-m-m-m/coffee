"use client";

import { useTranslations } from "next-intl";
import { useState, type ComponentProps } from "react";

/** A password input with a show/hide button. Spread react-hook-form's `register(...)` onto it. */
export function PasswordField({ className = "", ...props }: ComponentProps<"input">) {
  const t = useTranslations("Auth");
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={shown ? "text" : "password"} className={`${className} pe-20`} />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-pressed={shown}
        className="absolute inset-y-0 end-2 my-auto h-8 rounded px-2 text-sm text-muted"
      >
        {shown ? t("hidePassword") : t("showPassword")}
      </button>
    </div>
  );
}
