import arAdmin from "../../messages/ar/admin.json";
import arAuth from "../../messages/ar/auth.json";
import arCommon from "../../messages/ar/common.json";
import arEmails from "../../messages/ar/emails.json";
import arErrors from "../../messages/ar/errors.json";
import arStore from "../../messages/ar/store.json";
import enAdmin from "../../messages/en/admin.json";
import enAuth from "../../messages/en/auth.json";
import enCommon from "../../messages/en/common.json";
import enEmails from "../../messages/en/emails.json";
import enErrors from "../../messages/en/errors.json";
import enStore from "../../messages/en/store.json";
import type { Locale } from "./config";

const ar = {
  Common: arCommon,
  Errors: arErrors,
  Emails: arEmails,
  Store: arStore,
  Auth: arAuth,
  Admin: arAdmin,
};

/** The Arabic catalog is the source of truth for the key shape: English must match it exactly (typed + unit-tested). */
export type Messages = typeof ar;

const en: Messages = {
  Common: enCommon,
  Errors: enErrors,
  Emails: enEmails,
  Store: enStore,
  Auth: enAuth,
  Admin: enAdmin,
};

export const messages: Record<Locale, Messages> = { ar, en };
