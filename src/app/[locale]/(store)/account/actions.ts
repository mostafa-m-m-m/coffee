"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import * as account from "@/lib/services/account";
import { ApiError } from "@/lib/api-error";
import { addressSchema, profileSchema } from "@/lib/validations/address";

export type FormState = { error?: string; fields?: Record<string, string>; ok?: boolean };

async function userId() {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHENTICATED");
  return session.user.id;
}

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const fields: Record<string, string> = {};
  for (const i of issues) fields[String(i.path[0])] ??= i.message;
  return fields;
}

export async function updateProfile(_: FormState, form: FormData): Promise<FormState> {
  const id = await userId();
  const parsed = profileSchema.safeParse({
    name: form.get("name"),
    phone: String(form.get("phone") ?? "") || undefined,
  });
  if (!parsed.success) return { fields: fieldErrors(parsed.error.issues) };
  await account.updateProfile(id, parsed.data);
  revalidatePath("/[locale]/account", "page");
  return { ok: true };
}

export async function addAddress(_: FormState, form: FormData): Promise<FormState> {
  const id = await userId();
  const parsed = addressSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fields: fieldErrors(parsed.error.issues) };
  try {
    await account.addAddress(id, parsed.data);
  } catch (e) {
    if (e instanceof ApiError && e.fields) return { fields: e.fields };
    throw e;
  }
  revalidatePath("/[locale]/account", "page");
  return { ok: true };
}

export async function deleteAddress(addressId: string) {
  const id = await userId();
  await account.deleteAddress(id, addressId).catch((e) => {
    if (!(e instanceof ApiError && e.status === 404)) throw e;
  });
  revalidatePath("/[locale]/account", "page");
}
