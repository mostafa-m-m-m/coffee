"use client";

import { inputVariants } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGES_PER_PRODUCT } from "@/lib/config";

const input = cn(inputVariants(), "w-full");

type Signed = {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  allowedFormats: string;
};

/**
 * Product images: thumbnails with remove buttons, an upload button (direct to Cloudinary with a
 * signature from our server) when uploads are configured, and always the plain URL list as the
 * fallback. The form stores the URLs as one text value, one per line.
 */
export function ImageField({
  value,
  onChange,
  uploadsEnabled,
  disabled,
  error,
}: {
  value: string;
  onChange: (text: string) => void;
  uploadsEnabled: boolean;
  disabled?: boolean;
  error?: string;
}) {
  const t = useTranslations("Admin.productForm");
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const urls = value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const set = (next: string[]) => onChange(next.join("\n"));

  async function uploadOne(file: File): Promise<string> {
    const signedRes = await fetch("/api/admin/uploads/sign", { method: "POST" });
    if (!signedRes.ok) throw new Error("sign");
    const s = (await signedRes.json()) as Signed;
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", s.apiKey);
    form.append("timestamp", String(s.timestamp));
    form.append("signature", s.signature);
    form.append("folder", s.folder);
    form.append("allowed_formats", s.allowedFormats);
    const res = await fetch(s.uploadUrl, { method: "POST", body: form });
    if (!res.ok) throw new Error("upload");
    return ((await res.json()) as { secure_url: string }).secure_url;
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = MAX_IMAGES_PER_PRODUCT - urls.length;
    if (files.length > room) {
      toast.error(t("maxImages", { max: MAX_IMAGES_PER_PRODUCT }));
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    for (const f of files) {
      if (!(IMAGE_TYPES as readonly string[]).includes(f.type)) {
        toast.error(t("imageType", { name: f.name }));
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
      if (f.size > MAX_IMAGE_BYTES) {
        toast.error(t("imageTooLarge", { name: f.name, mb: MAX_IMAGE_BYTES / 1024 / 1024 }));
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
    }
    setBusy(true);
    try {
      const added: string[] = [];
      for (const f of files) added.push(await uploadOne(f));
      set([...urls, ...added]);
    } catch {
      toast.error(t("uploadFailed"));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{t("images")}</span>
        <span className="text-xs text-muted">
          {t("imagesCount", { count: urls.length, max: MAX_IMAGES_PER_PRODUCT })}
        </span>
      </div>

      {urls.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {urls.map((u, i) => (
            <li
              key={`${u}-${i}`}
              className="relative size-20 overflow-hidden rounded-md border border-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an arbitrary URL */}
              <img src={u} alt="" className="size-full object-cover" />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => set(urls.filter((_, j) => j !== i))}
                  aria-label={t("removeImage", { n: i + 1 })}
                  className="absolute end-1 top-1 grid size-5 place-items-center rounded-full bg-black/60 text-xs text-white"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!disabled &&
        (uploadsEnabled ? (
          <div>
            <input
              ref={fileRef}
              id={`${id}-file`}
              type="file"
              multiple
              accept={IMAGE_TYPES.join(",")}
              className="sr-only"
              onChange={(e) => onFiles(e.target.files)}
              disabled={busy || urls.length >= MAX_IMAGES_PER_PRODUCT}
            />
            <label
              htmlFor={`${id}-file`}
              className="inline-block cursor-pointer rounded-md border border-border px-3 py-1.5 text-sm has-[:disabled]:opacity-50"
            >
              {busy ? t("uploading") : t("uploadImages")}
            </label>
          </div>
        ) : (
          <p className="text-xs text-muted">{t("uploadsOff")}</p>
        ))}

      <label htmlFor={`${id}-urls`} className="block text-xs text-muted">
        {t("imageUrls")}
      </label>
      <textarea
        id={`${id}-urls`}
        dir="ltr"
        rows={3}
        placeholder="https://..."
        className={input}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && (
        <p id="img-err" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
