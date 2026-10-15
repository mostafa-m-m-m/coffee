import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { faker, fakerAR } from "@faker-js/faker";
import {
  PrismaClient,
  Role,
  type Locale,
  type Prisma,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from "../src/generated/prisma/client";
import { computeTotals } from "../src/lib/pricing";
import { buildSearchText } from "../src/lib/i18n/localized";
import { CATEGORIES, PRODUCTS } from "./data/products";
import { ZONES } from "./data/zones";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

faker.seed(42);
fakerAR.seed(42);

const ORDER_COUNT = Number(process.env.SEED_ORDERS ?? 20_000);
const CUSTOMER_COUNT = 500;
const DAY = 86_400_000;
const NOW = Date.now();

// roughly how Egyptian orders spread: Cairo and Giza are over half
const GOV_WEIGHTS: Record<string, number> = {
  C: 30,
  GZ: 20,
  ALX: 10,
  KB: 5,
  DK: 3,
  SHR: 3,
  GH: 3,
  MNF: 2,
  BH: 2,
  AST: 2,
  MN: 2,
  FYM: 2,
  SHG: 1.5,
  IS: 1.5,
  PTS: 1.5,
  SUZ: 1.5,
};

const AREAS = [
  "Maadi",
  "Nasr City",
  "Heliopolis",
  "Dokki",
  "Mohandessin",
  "New Cairo",
  "6th of October",
  "Sheikh Zayed",
  "Zamalek",
  "Smouha",
  "Mansoura Center",
  "Tanta Center",
];
const AREAS_AR = [
  "المعادي",
  "مدينة نصر",
  "مصر الجديدة",
  "الدقي",
  "المهندسين",
  "القاهرة الجديدة",
  "6 أكتوبر",
  "الشيخ زايد",
  "الزمالك",
  "سموحة",
  "وسط المنصورة",
  "وسط طنطا",
];

function weightedGov(allGov: string[]) {
  const weights = allGov.map((g) => GOV_WEIGHTS[g] ?? 0.6);
  return faker.helpers.weightedArrayElement(
    allGov.map((g, i) => ({ value: g, weight: weights[i] })),
  );
}

const phone = () =>
  `01${faker.helpers.arrayElement(["0", "1", "2", "5"])}${faker.string.numeric(8)}`;

async function main() {
  console.log("Clearing existing data...");
  for (const t of [
    "activityLog",
    "emailLog",
    "analyticsEvent",
    "subscriber",
    "orderEvent",
    "inventoryLog",
    "orderItem",
    "order",
    "cartItem",
    "cart",
    "address",
    "productVariant",
    "product",
    "category",
    "shippingZone",
    "user",
  ] as const) {
    await (db[t] as unknown as { deleteMany: () => Promise<unknown> }).deleteMany();
  }

  // ---- zones, categories, products ----
  const zones = await Promise.all(
    ZONES.map((z, i) => db.shippingZone.create({ data: { ...z, sortOrder: i } })),
  );
  const zoneByGov = new Map(zones.flatMap((z) => z.governorates.map((g) => [g, z] as const)));
  const allGov = [...zoneByGov.keys()];

  const categories = await Promise.all(
    CATEGORIES.map((c, i) =>
      db.category.create({ data: { slug: c.slug, name: c.name, sortOrder: i } }),
    ),
  );
  const catId = Object.fromEntries(categories.map((c) => [c.slug, c.id]));

  type VariantRow = {
    id: string;
    productId: string;
    name: unknown;
    productName: unknown;
    priceCents: number;
  };
  const variantRows: VariantRow[] = [];
  const productIds: string[] = [];
  const lowStockPlan = new Set(["BEAN-0003", "BEAN-0010", "GEAR-0220", "BLND-0140"]);
  let created = 0;
  for (const p of PRODUCTS) {
    const product = await db.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        description: p.description,
        searchText: buildSearchText(p.name, p.description, p.origin ?? ""),
        origin: p.origin,
        roastLevel: p.roast,
        tastingNotes: p.notes ?? [],
        images: [`/img/${p.slug}`],
        categoryId: catId[p.category],
        createdAt: new Date(NOW - (PRODUCTS.length - created) * 3 * DAY),
        variants: {
          create: p.variants.map((v) => ({
            name: v.name,
            sku: v.sku,
            priceCents: v.price * 100,
            stock: lowStockPlan.has(v.sku)
              ? faker.number.int({ min: 0, max: 4 })
              : faker.number.int({ min: 25, max: 400 }),
          })),
        },
      },
      include: { variants: true },
    });
    created++;
    productIds.push(product.id);
    for (const v of product.variants) {
      variantRows.push({
        id: v.id,
        productId: product.id,
        name: v.name,
        productName: product.name,
        priceCents: v.priceCents,
      });
    }
  }
  await db.inventoryLog.createMany({
    data: (await db.productVariant.findMany({ select: { id: true, stock: true } })).map((v) => ({
      variantId: v.id,
      change: v.stock,
      reason: "RESTOCK" as const,
      note: "Opening stock",
    })),
  });
  console.log(`Products: ${PRODUCTS.length}, variants: ${variantRows.length}`);

  // 80% of sales come from 20% of the products
  const shuffled = faker.helpers.shuffle(productIds);
  const productWeight = new Map(shuffled.map((id, i) => [id, 1 / Math.pow(i + 1, 0.95)]));
  const variantsByProduct = new Map<string, VariantRow[]>();
  for (const v of variantRows)
    variantsByProduct.set(v.productId, [...(variantsByProduct.get(v.productId) ?? []), v]);
  const pickVariant = () => {
    const pid = faker.helpers.weightedArrayElement(
      shuffled.map((id) => ({ value: id, weight: productWeight.get(id)! })),
    );
    return faker.helpers.arrayElement(variantsByProduct.get(pid)!);
  };

  // ---- users ----
  const hash = await bcrypt.hash("Password123", 10);
  const demo = [
    { email: "admin@coffee.test", name: "Admin", role: Role.ADMIN, locale: "en" as Locale },
    { email: "viewer@coffee.test", name: "Demo Viewer", role: Role.VIEWER, locale: "en" as Locale },
    {
      email: "customer@coffee.test",
      name: "Demo Customer",
      role: Role.CUSTOMER,
      locale: "ar" as Locale,
    },
  ];
  await db.user.createMany({
    data: demo.map((u) => ({ ...u, emailVerified: true })),
  });
  const customers = Array.from({ length: CUSTOMER_COUNT }, (_, i) => ({
    email: `customer${i + 1}@example.com`,
    name: fakerAR.person.fullName(),
    phone: phone(),
    emailVerified: true,
    role: Role.CUSTOMER,
    locale: (i % 5 === 0 ? "en" : "ar") as Locale,
    createdAt: new Date(NOW - Math.random() * 365 * DAY),
  }));
  await db.user.createMany({ data: customers });
  const users = await db.user.findMany({
    select: { id: true, email: true, name: true, role: true, locale: true },
  });
  // everyone signs in with the same demo password (Better Auth reads it from the credential account)
  await db.account.createMany({
    data: users.map((u) => ({
      accountId: u.id,
      providerId: "credential",
      userId: u.id,
      password: hash,
    })),
  });
  const adminId = users.find((u) => u.email === "admin@coffee.test")!.id;
  const demoCustomer = users.find((u) => u.email === "customer@coffee.test")!;
  const customerUsers = users.filter((u) => u.role === Role.CUSTOMER);

  // one saved address per customer
  type Addr = {
    fullName: string;
    phone: string;
    governorate: string;
    area: string;
    street: string;
    building: string;
    zoneId: string;
  };
  const addressOf = new Map<string, Addr>();
  const addressRows = customerUsers.map((u) => {
    const governorate = weightedGov(allGov);
    const ix = faker.number.int({ min: 0, max: AREAS.length - 1 });
    const a: Addr = {
      fullName: u.name,
      phone: phone(),
      governorate,
      area: u.locale === "ar" ? AREAS_AR[ix] : AREAS[ix],
      street: u.locale === "ar" ? `شارع ${fakerAR.location.street()}` : faker.location.street(),
      building: String(faker.number.int({ min: 1, max: 80 })),
      zoneId: zoneByGov.get(governorate)!.id,
    };
    addressOf.set(u.id, a);
    return { ...a, userId: u.id, isDefault: true };
  });
  await db.address.createMany({ data: addressRows });

  // ---- orders ----
  const DEMO_ORDERS = 6;
  const localHour = () =>
    faker.helpers.weightedArrayElement([
      { value: 9, weight: 3 },
      { value: 11, weight: 5 },
      { value: 13, weight: 6 },
      { value: 16, weight: 6 },
      { value: 19, weight: 9 },
      { value: 21, weight: 10 },
      { value: 23, weight: 5 },
      { value: 2, weight: 1 },
    ]);
  /** More sales on Fri/Sat and at the end of the month, with steady growth over the year. */
  const pickTime = () => {
    for (;;) {
      const age = Math.random() * 365;
      const day = new Date(NOW - age * DAY);
      const dow = day.getUTCDay();
      const w =
        (0.6 + 0.8 * (1 - age / 365)) *
        (dow === 5 || dow === 6 ? 1.4 : 1) *
        (day.getUTCDate() >= 25 ? 1.25 : 1);
      if (Math.random() < w / 2.4) {
        day.setUTCHours(
          localHour() - 2,
          faker.number.int({ min: 0, max: 59 }),
          faker.number.int({ min: 0, max: 59 }),
          0,
        );
        return day;
      }
    }
  };

  const BATCH = 1000;
  const funnelCutoff = NOW - 90 * DAY;
  const pending: { id: string; ref: string }[] = [];

  for (let start = 0; start < ORDER_COUNT; start += BATCH) {
    const size = Math.min(BATCH, ORDER_COUNT - start);
    const orderList: Prisma.OrderCreateManyInput[] = [];
    const itemList: Prisma.OrderItemCreateManyInput[] = [];
    const eventList: Prisma.OrderEventCreateManyInput[] = [];
    const analyticsList: Prisma.AnalyticsEventCreateManyInput[] = [];

    for (let i = 0; i < size; i++) {
      const n = start + i;
      const id = faker.string.alphanumeric(25).toLowerCase();
      const isDemo = n < DEMO_ORDERS;
      const user = isDemo ? demoCustomer : faker.helpers.arrayElement(customerUsers);
      const addr = addressOf.get(user.id) ?? (addressOf.get(customerUsers[0].id) as Addr);
      const zone = zones.find((z) => z.id === addr.zoneId)!;
      const createdAt = isDemo ? new Date(NOW - (n * 6 + 3) * DAY) : pickTime();
      const ageDays = (NOW - createdAt.getTime()) / DAY;

      const method: PaymentMethod = Math.random() < 0.35 ? "COD" : "CARD";
      const lines = faker.number.int({ min: 1, max: 4 });
      let subtotal = 0;
      const used = new Set<string>();
      for (let l = 0; l < lines; l++) {
        const v = pickVariant();
        if (used.has(v.id)) continue;
        used.add(v.id);
        const qty = faker.helpers.weightedArrayElement([
          { value: 1, weight: 6 },
          { value: 2, weight: 3 },
          { value: 3, weight: 1 },
        ]);
        subtotal += v.priceCents * qty;
        itemList.push({
          orderId: id,
          variantId: v.id,
          productName: v.productName as Prisma.InputJsonValue,
          variantName: v.name as Prisma.InputJsonValue,
          unitPriceCents: v.priceCents,
          quantity: qty,
        });
      }
      const totals = computeTotals(subtotal, zone.feeCents);

      // lifecycle: 5% cancelled, 2% refunded after delivery, the rest follows its age
      const roll = Math.random();
      let status: OrderStatus;
      let payment: PaymentStatus;
      if (!isDemo && roll < 0.05) status = "CANCELLED";
      else if (ageDays >= zone.etaDays + 2) status = "DELIVERED";
      else if (ageDays >= 1) status = "SHIPPED";
      else status = "CONFIRMED";
      if (status === "CANCELLED") payment = method === "CARD" ? "REFUNDED" : "UNPAID";
      else if (method === "CARD") payment = "PAID";
      else payment = status === "DELIVERED" ? "PAID" : "UNPAID";
      if (!isDemo && status === "DELIVERED" && roll >= 0.05 && roll < 0.07 && payment === "PAID")
        payment = "REFUNDED";

      const confirmedAt = new Date(createdAt.getTime() + (method === "CARD" ? 2 * 60_000 : 0));
      orderList.push({
        id,
        userId: user.id,
        status,
        paymentMethod: method,
        paymentStatus: payment,
        ...totals,
        shippingAddress: {
          fullName: addr.fullName,
          phone: addr.phone,
          governorate: addr.governorate,
          area: addr.area,
          street: addr.street,
          building: addr.building,
          zone: { id: zone.id, name: zone.name, etaDays: zone.etaDays, feeCents: zone.feeCents },
        },
        locale: user.locale,
        confirmedAt,
        createdAt,
      });

      // the history an admin would see on the order page
      const at = (ms: number) => new Date(createdAt.getTime() + ms);
      const actor = Math.random() < 0.5 ? adminId : null;
      eventList.push({
        orderId: id,
        type: "created",
        toStatus: "CONFIRMED",
        note: method,
        createdAt,
      });
      if (method === "CARD")
        eventList.push({
          orderId: id,
          type: "payment_succeeded",
          fromStatus: "PENDING",
          toStatus: "CONFIRMED",
          createdAt: confirmedAt,
        });
      if (status === "CANCELLED") {
        eventList.push({
          orderId: id,
          type: "status_changed",
          fromStatus: "CONFIRMED",
          toStatus: "CANCELLED",
          actorId: adminId,
          createdAt: at(3 * 3600_000),
        });
        if (payment === "REFUNDED")
          eventList.push({
            orderId: id,
            type: "refunded",
            actorId: adminId,
            createdAt: at(3 * 3600_000 + 60_000),
          });
      } else {
        if (status !== "CONFIRMED")
          eventList.push({
            orderId: id,
            type: "status_changed",
            fromStatus: "CONFIRMED",
            toStatus: "SHIPPED",
            actorId: actor,
            createdAt: at(DAY * 0.9),
          });
        if (status === "DELIVERED") {
          eventList.push({
            orderId: id,
            type: "status_changed",
            fromStatus: "SHIPPED",
            toStatus: "DELIVERED",
            actorId: actor,
            createdAt: at(DAY * (zone.etaDays + 0.5)),
          });
          if (method === "COD")
            eventList.push({
              orderId: id,
              type: "payment_succeeded",
              note: "cod_collected",
              createdAt: at(DAY * (zone.etaDays + 0.5)),
            });
          if (payment === "REFUNDED")
            eventList.push({
              orderId: id,
              type: "refunded",
              actorId: adminId,
              createdAt: at(DAY * (zone.etaDays + 3)),
            });
        }
      }

      // conversion funnel for the recent past: this order's own visit, plus visitors who left
      if (createdAt.getTime() >= funnelCutoff) {
        const sid = faker.string.alphanumeric(16);
        const pid = variantRows.find(
          (v) => v.id === (itemList[itemList.length - 1] as { variantId: string }).variantId,
        )!.productId;
        for (const type of [
          "PRODUCT_VIEW",
          "ADD_TO_CART",
          "CHECKOUT_START",
          "ORDER_PLACED",
        ] as const) {
          analyticsList.push({
            type,
            sessionId: sid,
            userId: user.id,
            productId: type === "ORDER_PLACED" ? null : pid,
            orderId: type === "ORDER_PLACED" ? id : null,
            createdAt: new Date(
              createdAt.getTime() -
                (type === "PRODUCT_VIEW"
                  ? 600_000
                  : type === "ADD_TO_CART"
                    ? 300_000
                    : type === "CHECKOUT_START"
                      ? 120_000
                      : 0),
            ),
          });
        }
        const drop = faker.helpers.weightedArrayElement([
          { value: 0, weight: 5 },
          { value: 1, weight: 3 },
          { value: 2, weight: 1.5 },
        ]);
        for (let d = 0; d < 3 + drop; d++) {
          const s = faker.string.alphanumeric(16);
          const at2 = new Date(createdAt.getTime() + faker.number.int({ min: -DAY, max: DAY }));
          const reach = faker.helpers.weightedArrayElement([
            { value: 1, weight: 10 },
            { value: 2, weight: 4 },
            { value: 3, weight: 2 },
          ]);
          const types = ["PRODUCT_VIEW", "ADD_TO_CART", "CHECKOUT_START"] as const;
          for (let t = 0; t < reach; t++)
            analyticsList.push({
              type: types[t],
              sessionId: s,
              productId: pickVariant().productId,
              createdAt: at2,
            });
        }
      }
    }
    await db.order.createMany({ data: orderList });
    await db.orderItem.createMany({ data: itemList });
    await db.orderEvent.createMany({ data: eventList });
    await db.analyticsEvent.createMany({ data: analyticsList });
    console.log(`Orders: ${start + size}/${ORDER_COUNT}`);
  }

  // a few card payments still waiting, so the dashboard and the expiry job have something real
  for (let i = 0; i < 4; i++) {
    const user = faker.helpers.arrayElement(customerUsers);
    const addr = addressOf.get(user.id)!;
    const zone = zones.find((z) => z.id === addr.zoneId)!;
    const v = pickVariant();
    const totals = computeTotals(v.priceCents, zone.feeCents);
    const ref = faker.string.hexadecimal({ length: 32, prefix: "", casing: "lower" });
    const createdAt = new Date(NOW - (i + 1) * 4 * 60_000);
    const order = await db.order.create({
      data: {
        userId: user.id,
        status: "PENDING",
        paymentMethod: "CARD",
        paymentStatus: "UNPAID",
        paymentRef: ref,
        paymentExpiresAt: new Date(createdAt.getTime() + 30 * 60_000),
        ...totals,
        locale: user.locale,
        createdAt,
        shippingAddress: {
          fullName: addr.fullName,
          phone: addr.phone,
          governorate: addr.governorate,
          area: addr.area,
          street: addr.street,
          building: addr.building,
          zone: { id: zone.id, name: zone.name, etaDays: zone.etaDays, feeCents: zone.feeCents },
        },
        items: {
          create: [
            {
              variantId: v.id,
              productName: v.productName as object,
              variantName: v.name as object,
              unitPriceCents: v.priceCents,
              quantity: 1,
            },
          ],
        },
        events: { create: [{ type: "created", toStatus: "PENDING", note: "CARD", createdAt }] },
      },
    });
    pending.push({ id: order.id, ref });
  }

  // abandoned carts: customers who added items and never came back
  const carts = faker.helpers.arrayElements(customerUsers, 60);
  for (const u of carts) {
    const cart = await db.cart.create({
      data: {
        userId: u.id,
        updatedAt: new Date(NOW - faker.number.int({ min: 2, max: 30 }) * DAY),
      },
    });
    const picks = new Set(
      Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => pickVariant().id),
    );
    await db.cartItem.createMany({
      data: [...picks].map((variantId) => ({
        cartId: cart.id,
        variantId,
        quantity: faker.number.int({ min: 1, max: 2 }),
      })),
    });
  }

  // newsletter and interest sign-ups (shown as numbers in the dashboard)
  await db.subscriber.createMany({
    data: [
      ...Array.from({ length: 30 }, (_, i) => ({
        email: `news${i + 1}@example.com`,
        source: "newsletter",
        locale: (i % 3 === 0 ? "en" : "ar") as Locale,
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        email: `interest${i + 1}@example.com`,
        source: "subscription-interest",
        locale: "ar" as Locale,
      })),
    ],
  });

  console.log(`Pending card payments: ${pending.length}`);
  console.log(
    "Seed complete. Login: admin@coffee.test / viewer@coffee.test / customer@coffee.test — password: Password123",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
