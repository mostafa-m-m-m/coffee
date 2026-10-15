"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";

/** Large image with a row of thumbnails. With one image (or none) it is just the picture. */
export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const t = useTranslations("Store.product");
  const [active, setActive] = useState(0);
  const current = images[active];
  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-border">
        {current && (
          <Image
            src={current}
            alt={name}
            fill
            priority={active === 0}
            unoptimized
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        )}
      </div>
      {images.length > 1 && (
        <ul className="flex flex-wrap gap-2" aria-label={t("gallery")}>
          {images.map((src, i) => (
            <li key={`${src}-${i}`}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={t("showImage", { n: i + 1 })}
                aria-pressed={i === active}
                className={`relative block size-16 overflow-hidden rounded-md border-2 bg-border ${
                  i === active ? "border-accent" : "border-transparent"
                }`}
              >
                <Image src={src} alt="" fill unoptimized sizes="64px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
