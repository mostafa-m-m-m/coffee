import { expect } from "vitest";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { buildSearchText, type LocalizedText } from "@/lib/i18n/localized";

export const L = (en: string, ar: string = en): LocalizedText => ({ en, ar });

/** Wipes the test database (never anything else: the URL is checked). */
export async function resetDb() {
  expect(process.env.DATABASE_URL).toMatch(/_test/);
  await db.emailLog.deleteMany();
  await db.analyticsEvent.deleteMany();
  await db.subscriber.deleteMany();
  await db.orderEvent.deleteMany();
  await db.inventoryLog.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.cartItem.deleteMany();
  await db.cart.deleteMany();
  await db.address.deleteMany();
  await db.productVariant.deleteMany();
  await db.product.deleteMany();
  await db.category.deleteMany();
  await db.shippingZone.deleteMany();
  await db.user.deleteMany();
  await db.activityLog.deleteMany();
}

export const address = {
  fullName: "Test Buyer",
  phone: "01000000000",
  governorate: "C" as const,
  area: "Maadi",
  street: "Road 9",
  building: "12",
};

export const makeZone = (over: Partial<Prisma.ShippingZoneCreateInput> = {}) =>
  db.shippingZone.create({
    data: {
      name: L("Greater Cairo", "القاهرة الكبرى"),
      governorates: ["C", "GZ", "KB"],
      feeCents: 5000,
      etaDays: 2,
      ...over,
    },
  });

export const makeUser = (
  email: string,
  name = email.split("@")[0],
  role: "CUSTOMER" | "ADMIN" | "VIEWER" = "CUSTOMER",
) => db.user.create({ data: { email, name, role } });

export async function makeProduct(opts: {
  slug: string;
  categorySlug?: string;
  name?: LocalizedText;
  description?: LocalizedText;
  variants: { sku: string; priceCents: number; stock: number; name?: LocalizedText }[];
  isActive?: boolean;
  tastingNotes?: string[];
}) {
  const category = await db.category.upsert({
    where: { slug: opts.categorySlug ?? "beans" },
    update: {},
    create: { slug: opts.categorySlug ?? "beans", name: L(opts.categorySlug ?? "Beans", "بن") },
  });
  const name = opts.name ?? L(`Product ${opts.slug}`, `منتج ${opts.slug}`);
  const description = opts.description ?? L("Fresh roasted beans", "بن محمص طازج");
  return db.product.create({
    data: {
      slug: opts.slug,
      name,
      description,
      searchText: buildSearchText(name, description),
      images: [],
      tastingNotes: opts.tastingNotes ?? [],
      isActive: opts.isActive ?? true,
      categoryId: category.id,
      variants: {
        create: opts.variants.map((v) => ({
          sku: v.sku,
          name: v.name ?? L("250g", "250 جم"),
          priceCents: v.priceCents,
          stock: v.stock,
        })),
      },
    },
    include: { variants: true },
  });
}

export const stockOf = async (id: string) =>
  (await db.productVariant.findUniqueOrThrow({ where: { id } })).stock;

/** A bare order row for reports/listing tests (no items unless given). */
export function rawOrder(
  userId: string,
  over: Partial<Prisma.OrderUncheckedCreateInput> & { cents?: number } = {},
) {
  const { cents = 10000, ...rest } = over;
  return db.order.create({
    data: {
      userId,
      status: "CONFIRMED",
      paymentMethod: "CARD",
      paymentStatus: "PAID",
      subtotalCents: cents,
      shippingCents: 0,
      vatCents: Math.round((cents * 0.14) / 1.14),
      totalCents: cents,
      shippingAddress: {},
      confirmedAt: rest.createdAt ?? new Date(),
      ...rest,
    },
  });
}
