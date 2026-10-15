"use client";

import { inputVariants } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { buttonVariants } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { useErrorText } from "@/hooks/use-error-text";
import { GOVERNORATES } from "@/lib/geo";
import { addAddress, deleteAddress, updateProfile, type FormState } from "./actions";

const input = cn(inputVariants(), "w-full");
const btn = buttonVariants();

function Field({
  name,
  label,
  state,
  defaultValue,
  type = "text",
}: {
  name: string;
  label: string;
  state: FormState;
  defaultValue?: string;
  type?: string;
}) {
  const text = useErrorText();
  const err = text.field(state.fields?.[name]);
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        aria-invalid={!!err}
        aria-describedby={err ? `${name}-err` : undefined}
        className={input}
      />
      {err && (
        <p id={`${name}-err`} role="alert" className="text-sm text-danger">
          {err}
        </p>
      )}
    </div>
  );
}

export function ProfileForm({
  name,
  email,
  phone,
}: {
  name: string;
  email: string;
  phone: string;
}) {
  const t = useTranslations("Store.account");
  const [state, action, pending] = useActionState(updateProfile, {});
  return (
    <form action={action} className="max-w-sm space-y-3">
      <Field name="name" label={t("fields.name")} state={state} defaultValue={name} />
      <Field name="phone" label={t("fields.phone")} state={state} defaultValue={phone} type="tel" />
      <p className="text-sm text-muted">{email}</p>
      <button disabled={pending} className={btn}>
        {t("save")}
      </button>
      {state.ok && (
        <p role="status" className="text-sm text-success">
          {t("saved")}
        </p>
      )}
    </form>
  );
}

export function AddressForm() {
  const t = useTranslations("Store.account");
  const tGov = useTranslations("Common.governorates");
  const text = useErrorText();
  const [state, action, pending] = useActionState(addAddress, {});
  return (
    <form
      key={state.ok ? "reset" : "form"}
      action={action}
      className="grid max-w-xl gap-3 sm:grid-cols-2"
    >
      <Field name="fullName" label={t("fields.fullName")} state={state} />
      <Field name="phone" label={t("fields.phone")} state={state} type="tel" />
      <div className="space-y-1">
        <label htmlFor="governorate" className="text-sm font-medium">
          {t("fields.governorate")}
        </label>
        <select
          id="governorate"
          name="governorate"
          defaultValue=""
          aria-invalid={!!state.fields?.governorate}
          className={input}
        >
          <option value="">{t("selectGovernorate")}</option>
          {GOVERNORATES.map((g) => (
            <option key={g} value={g}>
              {tGov(g)}
            </option>
          ))}
        </select>
        {state.fields?.governorate && (
          <p role="alert" className="text-sm text-danger">
            {text.field(state.fields.governorate)}
          </p>
        )}
      </div>
      <Field name="area" label={t("fields.area")} state={state} />
      <Field name="street" label={t("fields.street")} state={state} />
      <Field name="building" label={t("fields.building")} state={state} />
      <div className="sm:col-span-2">
        <Field name="notes" label={t("fields.notes")} state={state} />
      </div>
      <div className="sm:col-span-2">
        <button disabled={pending} className={btn}>
          {t("addAddress")}
        </button>
      </div>
    </form>
  );
}

export function DeleteAddressButton({ id }: { id: string }) {
  const t = useTranslations("Store.account");
  return (
    <form action={deleteAddress.bind(null, id)}>
      <button className="text-sm text-danger underline">{t("delete")}</button>
    </form>
  );
}
