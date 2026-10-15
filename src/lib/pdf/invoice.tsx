import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Locale } from "@/i18n/config";
import { VAT_RATE } from "@/lib/config";
import { emailContext } from "@/lib/email/context";
import { money } from "@/lib/format";
import { pick, type LocalizedText } from "@/lib/i18n/localized";
import { brand } from "@/lib/brand";
import { PDF_FONT } from "./fonts";

export type InvoiceData = {
  orderNumber: number;
  confirmedAt: Date;
  paymentMethod: "CARD" | "COD";
  paymentStatus: "UNPAID" | "PAID" | "FAILED" | "REFUNDED";
  subtotalCents: number;
  shippingCents: number;
  vatCents: number;
  totalCents: number;
  customerName: string;
  customerEmail: string;
  address: {
    fullName?: string;
    phone?: string;
    governorate?: string;
    area?: string;
    street?: string;
    building?: string;
  };
  items: {
    productName: LocalizedText;
    variantName: LocalizedText;
    unitPriceCents: number;
    quantity: number;
  }[];
};

const c = {
  ink: brand.light.foreground,
  muted: brand.light.muted,
  line: brand.light.border,
  accent: brand.light.accent,
};

const base = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: c.ink, fontFamily: PDF_FONT },
  bold: { fontWeight: 700 },
  muted: { color: c.muted },
});

/**
 * Bilingual invoice. Arabic lays out right to left (rows reversed, text aligned right); everything
 * on it is read from the order snapshot and the message catalog, in the order's language.
 */
export function InvoiceDocument({ data, locale }: { data: InvoiceData; locale: Locale }) {
  const { tCommon, f } = emailContext(locale);
  const t = (key: string, values?: Record<string, string | number>) =>
    tCommon(`invoice.${key}` as never, values as never) as string;
  const rtl = locale === "ar";
  const row = { flexDirection: rtl ? "row-reverse" : "row" } as const;
  const align = { textAlign: rtl ? "right" : "left" } as const;
  const end = { textAlign: rtl ? "left" : "right" } as const;
  const a = data.address;
  const gov = a.governorate ? (tCommon(`governorates.${a.governorate}` as never) as string) : "";
  const addressLines = [
    a.fullName,
    [a.building, a.street].filter(Boolean).join(" "),
    a.area,
    gov,
    a.phone,
  ].filter(Boolean);
  const date = f.dateTime(data.confirmedAt, "date");

  const cell = (flex: number, style: object = align) => ({ flex, ...style });

  return (
    <Document title={`${t("title")} ${data.orderNumber}`} author={brand.name}>
      <Page size="A4" style={base.page}>
        <View style={{ ...row, justifyContent: "space-between", alignItems: "flex-start" }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: 700, color: brand.logo.espresso }}>
              {brand.shortName.toLowerCase()}
              <Text style={{ color: brand.logo.ember }}>.</Text>
            </Text>
            <Text style={{ ...base.muted, fontSize: 7, letterSpacing: 2 }}>ROASTERY</Text>
          </View>
          <View>
            <Text style={{ fontSize: 20, fontWeight: 700, color: c.accent, ...end }}>
              {t("title")}
            </Text>
            <Text style={{ ...base.muted, ...end }}>
              {t("number")}: {data.orderNumber}
            </Text>
            <Text style={{ ...base.muted, ...end }}>
              {t("date")}: {date}
            </Text>
          </View>
        </View>

        <View style={{ ...row, justifyContent: "space-between", marginTop: 28 }}>
          <View style={{ width: "48%" }}>
            <Text style={{ ...base.bold, ...align, marginBottom: 4 }}>{t("billTo")}</Text>
            <Text style={align}>{data.customerName}</Text>
            <Text style={{ ...base.muted, ...align }}>{data.customerEmail}</Text>
          </View>
          <View style={{ width: "48%" }}>
            <Text style={{ ...base.bold, ...align, marginBottom: 4 }}>{t("shipTo")}</Text>
            {addressLines.map((l, i) => (
              <Text key={i} style={align}>
                {l}
              </Text>
            ))}
          </View>
        </View>

        <View style={{ marginTop: 28 }}>
          <View
            style={{ ...row, borderBottomWidth: 1, borderBottomColor: c.ink, paddingBottom: 4 }}
          >
            <Text style={{ ...cell(5), ...base.bold }}>{t("item")}</Text>
            <Text style={{ ...cell(1, { textAlign: "center" }), ...base.bold }}>
              {t("quantity")}
            </Text>
            <Text style={{ ...cell(2, end), ...base.bold }}>{t("unitPrice")}</Text>
            <Text style={{ ...cell(2, end), ...base.bold }}>{t("lineTotal")}</Text>
          </View>
          {data.items.map((i, n) => (
            <View
              key={n}
              style={{
                ...row,
                borderBottomWidth: 1,
                borderBottomColor: c.line,
                paddingVertical: 6,
              }}
            >
              <Text style={cell(5)}>
                {pick(i.productName, locale)} — {pick(i.variantName, locale)}
              </Text>
              <Text style={cell(1, { textAlign: "center" })}>
                {f.number(i.quantity, "integer")}
              </Text>
              <Text style={cell(2, end)}>{money(f, i.unitPriceCents)}</Text>
              <Text style={cell(2, end)}>{money(f, i.unitPriceCents * i.quantity)}</Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 14, alignSelf: rtl ? "flex-start" : "flex-end", width: "50%" }}>
          {(
            [
              [t("subtotal"), money(f, data.subtotalCents), false],
              [
                t("shipping"),
                data.shippingCents === 0 ? t("freeShipping") : money(f, data.shippingCents),
                false,
              ],
              [t("vatIncluded", { rate: VAT_RATE }), money(f, data.vatCents), true],
            ] as const
          ).map(([label, value, muted]) => (
            <View
              key={label}
              style={{ ...row, justifyContent: "space-between", paddingVertical: 2 }}
            >
              <Text style={muted ? base.muted : undefined}>{label}</Text>
              <Text style={muted ? base.muted : undefined}>{value}</Text>
            </View>
          ))}
          <View
            style={{
              ...row,
              justifyContent: "space-between",
              borderTopWidth: 1,
              borderTopColor: c.ink,
              marginTop: 4,
              paddingTop: 4,
            }}
          >
            <Text style={{ ...base.bold, fontSize: 12 }}>{t("total")}</Text>
            <Text style={{ ...base.bold, fontSize: 12 }}>{money(f, data.totalCents)}</Text>
          </View>
        </View>

        <View style={{ marginTop: 22 }}>
          <Text style={{ ...base.bold, ...align }}>{t("payment")}</Text>
          <Text style={align}>
            {data.paymentStatus === "PAID"
              ? `${tCommon(`paymentMethod.${data.paymentMethod}` as never)} — ${t("paid")}`
              : t("codDue", { amount: money(f, data.totalCents) })}
          </Text>
        </View>

        <View style={{ position: "absolute", bottom: 30, left: 40, right: 40 }}>
          <Text style={{ textAlign: "center" }}>{t("thanks")}</Text>
          <Text style={{ ...base.muted, textAlign: "center", fontSize: 8, marginTop: 2 }}>
            {t("demoNote")}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
