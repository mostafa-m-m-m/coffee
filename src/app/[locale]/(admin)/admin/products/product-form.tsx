"use client";

import { inputVariants } from "@/components/ui/field";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useFieldArray, useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { confirmDialog } from "@/hooks/use-confirm";
import { useErrorText } from "@/hooks/use-error-text";
import { toast } from "@/hooks/use-toast";
import { localeNames, locales, type Locale } from "@/i18n/config";
import { useRouter } from "@/i18n/navigation";
import type { ApiErrorBody } from "@/lib/api-error";
import type { LocalizedText } from "@/lib/i18n/localized";
import { TASTING_NOTES } from "@/lib/tasting-notes";
import { productSchema, slugify, variantSchema } from "@/lib/validations/admin-products";
import { ImageField } from "./image-field";

// The form edits image URLs as one-per-line text; the API receives a proper array.
// (react-hook-form owns the name `id` inside field arrays, so the DB id is carried as `variantId`)
const formSchema = productSchema.omit({ images: true, variants: true }).extend({
  imagesText: z.string(),
  variants: z
    .array(variantSchema.omit({ id: true }).extend({ variantId: z.string().optional() }))
    .min(1, "validation.variantsMin")
    .max(30),
});
type FormValues = z.infer<typeof formSchema>;

type Props = {
  categories: { id: string; name: string }[];
  readOnly?: boolean;
  /** Cloudinary is configured, so images can be uploaded (otherwise only pasted as URLs) */
  uploadsEnabled?: boolean;
  product?: {
    id: string;
    name: LocalizedText;
    slug: string;
    description: LocalizedText;
    origin: string;
    roastLevel: "LIGHT" | "MEDIUM" | "DARK" | null;
    tastingNotes: string[];
    categoryId: string;
    images: string[];
    isActive: boolean;
    variants: FormValues["variants"];
  };
};

const input = cn(inputVariants(), "w-full");
const blank = (): LocalizedText => ({ en: "", ar: "" });
const emptyVariant = () => ({
  name: blank(),
  sku: "",
  price: 0,
  stock: 0,
  lowStockThreshold: 5,
  isArchived: false,
});

/** `msg` is a validation key ("validation.nameShort"); it is translated here. */
function Err({ id, msg }: { id: string; msg?: string }) {
  const text = useErrorText();
  return msg ? (
    <p id={id} role="alert" className="text-sm text-danger">
      {text.field(msg)}
    </p>
  ) : null;
}

export function ProductForm({
  categories,
  product,
  readOnly = false,
  uploadsEnabled = false,
}: Props) {
  const t = useTranslations("Admin.productForm");
  const tNotes = useTranslations("Common.tastingNotes");
  const tRoast = useTranslations("Common.roast");
  const text = useErrorText();
  const router = useRouter();
  const uiLocale = useLocale() as Locale;
  const editing = !!product;
  const [serverError, setServerError] = useState<string>();
  const [saved, setSaved] = useState(false);
  // both languages are always in the form; the tabs only choose which one is on screen
  const [tab, setTab] = useState<Locale>(uiLocale);

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    getFieldState,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onTouched",
    shouldFocusError: false, // the failing field may be on the other language tab
    defaultValues: product
      ? { ...product, imagesText: product.images.join("\n") }
      : {
          name: blank(),
          slug: "",
          description: blank(),
          origin: "",
          roastLevel: null,
          tastingNotes: [],
          categoryId: categories[0]?.id ?? "",
          imagesText: "",
          isActive: true,
          variants: [emptyVariant()],
        },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "variants" });

  const hasErrorIn = (l: Locale) =>
    !!errors.name?.[l] ||
    !!errors.description?.[l] ||
    !!errors.variants?.some?.((v) => v?.name?.[l]);

  async function submit({ imagesText, ...values }: FormValues) {
    setServerError(undefined);
    setSaved(false);
    const images = imagesText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const res = await fetch(editing ? `/api/admin/products/${product.id}` : "/api/admin/products", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        roastLevel: values.roastLevel || null,
        images,
        variants: values.variants.map(({ variantId, ...v }) => ({ ...v, id: variantId })),
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      const { error } = body as ApiErrorBody;
      for (const [path, message] of Object.entries(error?.fields ?? {})) {
        setError(
          (path === "images" || path.startsWith("images.")
            ? "imagesText"
            : path) as FieldPath<FormValues>,
          { message },
        );
      }
      const failure = text.api(error);
      setServerError(failure);
      toast.error(failure);
      return;
    }
    if (editing) {
      setSaved(true);
      toast.success(t("savedToast"));
      router.refresh();
    } else {
      toast.success(t("createdToast"));
      router.push(`/admin/products/${body.id}`);
    }
  }

  async function hide() {
    if (!product) return;
    const ok = await confirmDialog({
      title: t("hideTitle"),
      message: t("hideMessage"),
      confirmLabel: t("hideConfirm"),
      danger: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(t("hiddenToast"));
      router.push("/admin/products");
    } else {
      toast.error(t("hideFailed"));
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-6">
      <fieldset disabled={readOnly} className="space-y-6">
        <section className="space-y-4 rounded-lg border border-border bg-card p-4">
          {/* language tabs: name, description and variant names are written in both languages */}
          <div role="tablist" aria-label={t("languages")} className="flex gap-1">
            {locales.map((l) => (
              <button
                key={l}
                type="button"
                role="tab"
                id={`tab-${l}`}
                aria-selected={tab === l}
                aria-controls={`panel-${l}`}
                lang={l}
                onClick={() => setTab(l)}
                className={`rounded-md border px-3 py-1 text-sm ${
                  tab === l
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border hover:bg-border"
                }`}
              >
                {localeNames[l]}
                {hasErrorIn(l) && (
                  <span role="img" aria-label={t("tabHasErrors")} className="ms-1">
                    ⚠
                  </span>
                )}
              </button>
            ))}
          </div>

          {locales.map((l) => (
            <div
              key={l}
              role="tabpanel"
              id={`panel-${l}`}
              aria-labelledby={`tab-${l}`}
              hidden={tab !== l}
              lang={l}
              dir={l === "ar" ? "rtl" : "ltr"}
              className="grid gap-4"
            >
              <div className="space-y-1">
                <label htmlFor={`name-${l}`} className="text-sm font-medium">
                  {t("name")}
                </label>
                <input
                  id={`name-${l}`}
                  className={input}
                  aria-invalid={!!errors.name?.[l]}
                  {...register(`name.${l}`, {
                    onChange: (e) => {
                      // suggest a slug from the English name until the user edits it themselves
                      if (
                        l === "en" &&
                        !editing &&
                        !getFieldState("slug").isDirty &&
                        !dirtyFields.slug
                      ) {
                        setValue("slug", slugify(e.target.value));
                      }
                    },
                  })}
                />
                <Err id={`name-err-${l}`} msg={errors.name?.[l]?.message} />
              </div>
              <div className="space-y-1">
                <label htmlFor={`description-${l}`} className="text-sm font-medium">
                  {t("description")}
                </label>
                <textarea
                  id={`description-${l}`}
                  rows={3}
                  className={input}
                  aria-invalid={!!errors.description?.[l]}
                  {...register(`description.${l}`)}
                />
                <Err id={`description-err-${l}`} msg={errors.description?.[l]?.message} />
              </div>
            </div>
          ))}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="slug" className="text-sm font-medium">
                {t("slug")}
              </label>
              <input
                id="slug"
                dir="ltr"
                className={input}
                aria-invalid={!!errors.slug}
                {...register("slug")}
              />
              <Err id="slug-err" msg={errors.slug?.message} />
            </div>
            <div className="space-y-1">
              <label htmlFor="categoryId" className="text-sm font-medium">
                {t("category")}
              </label>
              <select id="categoryId" className={input} {...register("categoryId")}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Err id="cat-err" msg={errors.categoryId?.message} />
            </div>
            <div className="space-y-1">
              <label htmlFor="origin" className="text-sm font-medium">
                {t("origin")}
              </label>
              <input id="origin" className={input} {...register("origin")} />
            </div>
            <div className="space-y-1">
              <label htmlFor="roastLevel" className="text-sm font-medium">
                {t("roast")}
              </label>
              <select
                id="roastLevel"
                className={input}
                {...register("roastLevel", { setValueAs: (v) => v || null })}
              >
                <option value="">{t("roastNone")}</option>
                {(["LIGHT", "MEDIUM", "DARK"] as const).map((r) => (
                  <option key={r} value={r}>
                    {tRoast(r)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t("tastingNotes")}</legend>
            <div className="flex flex-wrap gap-2">
              {TASTING_NOTES.map((n) => (
                <label
                  key={n}
                  className="flex cursor-pointer items-center gap-1 rounded-full border border-border px-3 py-1 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
                >
                  <input
                    type="checkbox"
                    value={n}
                    className="sr-only"
                    {...register("tastingNotes")}
                  />
                  {tNotes(n)}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("isActive")} /> {t("visible")}
          </label>

          <Controller
            control={control}
            name="imagesText"
            render={({ field }) => (
              <ImageField
                value={field.value}
                onChange={field.onChange}
                uploadsEnabled={uploadsEnabled}
                disabled={readOnly}
              />
            )}
          />
          <Err id="img-err" msg={errors.imagesText?.message} />
        </section>

        <section
          aria-labelledby="variants"
          className="space-y-3 rounded-lg border border-border bg-card p-4"
        >
          <div className="flex items-center justify-between">
            <h2 id="variants" className="font-semibold">
              {t("variants")}
            </h2>
            {!readOnly && (
              <button
                type="button"
                onClick={() => append(emptyVariant())}
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                {t("addVariant")}
              </button>
            )}
          </div>
          <Err id="variants-err" msg={errors.variants?.root?.message ?? errors.variants?.message} />

          {fields.map((f, i) => {
            const e = errors.variants?.[i];
            const existing = !!f.variantId;
            return (
              <div
                key={f.id}
                className="grid items-start gap-3 rounded-md border border-border p-3 sm:grid-cols-[2fr_1.2fr_1fr_1fr_1fr_auto]"
              >
                <div className="space-y-1">
                  <label htmlFor={`v-name-${tab}-${i}`} className="text-xs text-muted">
                    {t("variantName")} <span lang={tab}>({localeNames[tab]})</span>
                  </label>
                  {locales.map((l) => (
                    <input
                      key={l}
                      id={`v-name-${l}-${i}`}
                      hidden={tab !== l}
                      lang={l}
                      dir={l === "ar" ? "rtl" : "ltr"}
                      placeholder={t("variantNamePlaceholder")}
                      className={input}
                      aria-invalid={!!e?.name?.[l]}
                      {...register(`variants.${i}.name.${l}`)}
                    />
                  ))}
                  <Err id={`v-name-err-${i}`} msg={e?.name?.[tab]?.message} />
                </div>
                <div className="space-y-1">
                  <label htmlFor={`v-sku-${i}`} className="text-xs text-muted">
                    SKU
                  </label>
                  <input
                    id={`v-sku-${i}`}
                    dir="ltr"
                    className={input}
                    aria-invalid={!!e?.sku}
                    {...register(`variants.${i}.sku`)}
                  />
                  <Err id={`v-sku-err-${i}`} msg={e?.sku?.message} />
                </div>
                <div className="space-y-1">
                  <label htmlFor={`v-price-${i}`} className="text-xs text-muted">
                    {t("price")}
                  </label>
                  <input
                    id={`v-price-${i}`}
                    type="number"
                    step="0.01"
                    min={0}
                    className={input}
                    aria-invalid={!!e?.price}
                    {...register(`variants.${i}.price`, { valueAsNumber: true })}
                  />
                  <Err id={`v-price-err-${i}`} msg={e?.price?.message} />
                </div>
                <div className="space-y-1">
                  <label htmlFor={`v-stock-${i}`} className="text-xs text-muted">
                    {existing ? t("stockReadOnly") : t("stockInitial")}
                  </label>
                  <input
                    id={`v-stock-${i}`}
                    type="number"
                    min={0}
                    readOnly={existing}
                    className={`${input} ${existing ? "bg-border/40" : ""}`}
                    aria-invalid={!!e?.stock}
                    {...register(`variants.${i}.stock`, { valueAsNumber: true })}
                  />
                  <Err id={`v-stock-err-${i}`} msg={e?.stock?.message} />
                </div>
                <div className="space-y-1">
                  <label htmlFor={`v-low-${i}`} className="text-xs text-muted">
                    {t("threshold")}
                  </label>
                  <input
                    id={`v-low-${i}`}
                    type="number"
                    min={0}
                    className={input}
                    {...register(`variants.${i}.lowStockThreshold`, { valueAsNumber: true })}
                  />
                </div>
                {existing ? (
                  <label className="flex items-center gap-1 self-end pb-2 text-xs">
                    <input type="checkbox" {...register(`variants.${i}.isArchived`)} />
                    {t("archived")}
                  </label>
                ) : fields.length > 1 && !readOnly ? (
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    aria-label={t("removeVariant", { number: i + 1 })}
                    className={cn(
                      buttonVariants({ variant: "secondary", size: "md" }),
                      "self-end text-danger",
                    )}
                  >
                    ✕
                  </button>
                ) : (
                  <span />
                )}
              </div>
            );
          })}
        </section>
      </fieldset>

      {serverError && (
        <p role="alert" className="text-sm text-danger">
          {serverError}
        </p>
      )}

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3">
          {/* mouse-down must not blur the field: its error message would shift the button and eat the click */}
          <button
            disabled={isSubmitting}
            onMouseDown={(e) => e.preventDefault()}
            className={buttonVariants({ variant: "primary", size: "md" })}
          >
            {isSubmitting ? t("saving") : editing ? t("saveChanges") : t("create")}
          </button>
          {editing && product.isActive && (
            <button
              type="button"
              onClick={hide}
              className="rounded-md border border-danger px-4 py-2 text-danger"
            >
              {t("hide")}
            </button>
          )}
          {saved && (
            <p role="status" className="text-sm text-success">
              {t("saved")}
            </p>
          )}
        </div>
      )}
    </form>
  );
}
