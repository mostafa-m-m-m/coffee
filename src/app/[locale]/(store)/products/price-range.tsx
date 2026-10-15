"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";

/**
 * Min and max price as two sliders with number boxes. Submitted as plain `min` / `max` fields, so
 * the form still works as an ordinary GET form. A value equal to the shelf's own limit is sent
 * empty ("not set"), so an untouched slider never narrows the results.
 */
export function PriceRange({
  bounds,
  min,
  max,
}: {
  bounds: { min: number; max: number };
  min?: number;
  max?: number;
}) {
  const t = useTranslations("Store.catalog");
  const id = useId();
  const [lo, setLo] = useState(min ?? bounds.min);
  const [hi, setHi] = useState(max ?? bounds.max);

  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 font-medium">{t("priceRange")}</legend>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor={`${id}-min`} className="mb-1 block text-xs text-muted">
            {t("minPrice")}
          </label>
          <input
            id={`${id}-min`}
            type="number"
            inputMode="numeric"
            min={bounds.min}
            max={bounds.max}
            value={lo}
            onChange={(e) => setLo(Math.min(Number(e.target.value) || bounds.min, hi))}
            className="w-full rounded-md border border-border bg-card px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor={`${id}-max`} className="mb-1 block text-xs text-muted">
            {t("maxPrice")}
          </label>
          <input
            id={`${id}-max`}
            type="number"
            inputMode="numeric"
            min={bounds.min}
            max={bounds.max}
            value={hi}
            onChange={(e) => setHi(Math.max(Number(e.target.value) || bounds.max, lo))}
            className="w-full rounded-md border border-border bg-card px-3 py-2"
          />
        </div>
      </div>
      <input
        type="range"
        aria-label={t("minPrice")}
        min={bounds.min}
        max={bounds.max}
        value={lo}
        onChange={(e) => setLo(Math.min(Number(e.target.value), hi))}
        className="w-full accent-[var(--color-accent)]"
      />
      <input
        type="range"
        aria-label={t("maxPrice")}
        min={bounds.min}
        max={bounds.max}
        value={hi}
        onChange={(e) => setHi(Math.max(Number(e.target.value), lo))}
        className="w-full accent-[var(--color-accent)]"
      />
      {/* the real fields: empty when the slider sits at the shelf's limit */}
      <input type="hidden" name="min" value={lo > bounds.min ? lo : ""} />
      <input type="hidden" name="max" value={hi < bounds.max ? hi : ""} />
    </fieldset>
  );
}
