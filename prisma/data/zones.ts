/** Shipping zones of the demo store: price and delivery time per area (editable from the dashboard). */
export const ZONES = [
  {
    name: { en: "Greater Cairo", ar: "القاهرة الكبرى" },
    governorates: ["C", "GZ", "KB"],
    feeCents: 5000,
    etaDays: 2,
  },
  {
    name: { en: "Alexandria & Delta", ar: "الإسكندرية والدلتا" },
    governorates: ["ALX", "BH", "DK", "DT", "GH", "KFS", "MNF", "SHR"],
    feeCents: 6500,
    etaDays: 3,
  },
  {
    name: { en: "Canal & Sinai", ar: "القناة وسيناء" },
    governorates: ["IS", "PTS", "SUZ", "SIN", "JS"],
    feeCents: 7500,
    etaDays: 4,
  },
  {
    name: { en: "Upper Egypt & Desert", ar: "الصعيد والصحراء" },
    governorates: ["AST", "ASN", "BNS", "FYM", "KN", "LX", "MN", "SHG", "WAD", "BA", "MT"],
    feeCents: 8500,
    etaDays: 5,
  },
];
