/**
 * Egypt's 27 governorates (ISO 3166-2:EG codes). Names are translated in
 * messages `Common.governorates.<code>`; shipping prices live in the ShippingZone table.
 */
export const GOVERNORATES = [
  "ALX",
  "ASN",
  "AST",
  "BA",
  "BH",
  "BNS",
  "C",
  "DK",
  "DT",
  "FYM",
  "GH",
  "GZ",
  "IS",
  "JS",
  "KB",
  "KFS",
  "KN",
  "LX",
  "MN",
  "MNF",
  "MT",
  "PTS",
  "SHG",
  "SHR",
  "SIN",
  "SUZ",
  "WAD",
] as const;
export type Governorate = (typeof GOVERNORATES)[number];

export const isGovernorate = (v: unknown): v is Governorate =>
  typeof v === "string" && (GOVERNORATES as readonly string[]).includes(v);

/** Egyptian mobile numbers: 01[0125] followed by 8 digits. */
export const EGYPT_MOBILE = /^01[0125]\d{8}$/;
