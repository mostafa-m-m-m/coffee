import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api-error";
import { db } from "@/lib/db";
import { buildInvoice } from "@/lib/services/invoices";
import { createOrder } from "@/lib/services/orders";
import { address, makeProduct, makeUser, makeZone, resetDb } from "./fixtures";

beforeEach(resetDb);
afterAll(() => db.$disconnect());

async function textOf(pdf: Buffer) {
  const doc = await getDocument({ data: new Uint8Array(pdf), useSystemFonts: false }).promise;
  const page = await doc.getPage(1);
  const content = await page.getTextContent();
  return content.items.map((i) => ("str" in i ? i.str : "")).join(" ");
}

let n = 0;
async function place(locale: "ar" | "en", method: "COD" | "CARD" = "COD") {
  n += 1;
  if (!(await db.shippingZone.count())) await makeZone();
  const user = await makeUser(`${locale}${n}@example.com`, "Sara Buyer");
  const product = await makeProduct({
    slug: `beans-${n}`,
    variants: [{ sku: `B-${n}`, priceCents: 25_000, stock: 9 }],
  });
  const order = await createOrder({
    userId: user.id,
    lines: [{ variantId: product.variants[0].id, quantity: 2 }],
    address,
    paymentMethod: method,
    locale,
  });
  return { user, order };
}

/** Set INVOICE_DEBUG_DIR to keep the PDFs and look at them. */
function keep(name: string, pdf: Buffer) {
  const dir = process.env.INVOICE_DEBUG_DIR;
  if (!dir) return;
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, name), pdf);
}

describe("invoice PDF", () => {
  it("English: a real PDF with the order's lines, VAT and total", async () => {
    const { user, order } = await place("en");
    const { pdf, orderNumber } = await buildInvoice(order.id, user.id);
    keep("invoice-en.pdf", pdf);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    const text = await textOf(pdf);
    expect(text).toContain("Invoice");
    expect(text).toContain(String(orderNumber));
    expect(text).toContain("Sara Buyer");
    expect(text).toContain("EGP 500");
    expect(text).toContain("Includes 14% VAT");
    expect(text).toContain("Cash on delivery");
  });

  it("Arabic: the same invoice with Arabic text and Arabic-Indic digits", async () => {
    const { user, order } = await place("ar");
    const { pdf } = await buildInvoice(order.id, user.id);
    keep("invoice-ar.pdf", pdf);
    const text = await textOf(pdf);
    expect(text).toMatch(/[؀-ۿ]/);
    expect(text).toMatch(/[٠-٩]/);
  });

  it("can be asked for in the other language", async () => {
    const { user, order } = await place("ar");
    const { pdf } = await buildInvoice(order.id, user.id, "en");
    expect(await textOf(pdf)).toContain("Invoice");
  });

  it("is only for the owner, and only for a real sale", async () => {
    const { user, order } = await place("en");
    const other = await makeUser("other@example.com");
    await expect(buildInvoice(order.id, other.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(buildInvoice(order.id, null)).resolves.toBeTruthy(); // staff

    const { order: card } = await place("en", "CARD"); // awaiting payment
    await expect(buildInvoice(card.id, null)).rejects.toBeInstanceOf(ApiError);

    await db.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED", paymentStatus: "REFUNDED" },
    });
    await expect(buildInvoice(order.id, user.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
