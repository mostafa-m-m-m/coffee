import { expect, test, type APIRequestContext } from "@playwright/test";
import { ACCOUNTS, login } from "./helpers";

const ADDRESS = {
  fullName: "API Tester",
  phone: "01012345678",
  governorate: "ALX",
  area: "Smouha",
  street: "Road 9",
  building: "12",
};

async function variantId(request: APIRequestContext) {
  const list = await (await request.get("/api/products?inStock=1")).json();
  const slug = (list.items ?? list.products)[0].slug as string;
  const product = await (await request.get(`/api/products/${slug}`)).json();
  return product.variants.find((v: { stock: number }) => v.stock > 3).id as string;
}

test.describe("shipping quote", () => {
  test("gives the fee and delivery time per governorate, and free shipping above the threshold", async ({
    request,
  }) => {
    const c = await (await request.get("/api/shipping/quote?governorate=C")).json();
    expect(c).toMatchObject({ feeCents: 5000, etaDays: 2 });
    const far = await (
      await request.get("/api/shipping/quote?governorate=ASN&subtotal=200")
    ).json();
    expect(far.shippingCents).toBe(far.feeCents);
    const free = await (
      await request.get("/api/shipping/quote?governorate=ASN&subtotal=1200")
    ).json();
    expect(free.shippingCents).toBe(0);
    expect((await request.get("/api/shipping/quote?governorate=NOPE")).status()).toBe(400);
    expect((await request.get("/api/shipping/quote")).status()).toBe(400);
  });
});

test.describe("my account API", () => {
  test("needs a session", async ({ request }) => {
    for (const path of ["/api/me", "/api/me/addresses", "/api/orders/me"]) {
      expect((await request.get(path)).status(), path).toBe(401);
    }
  });

  test("profile: read, edit and validate", async ({ page }) => {
    await login(page, ACCOUNTS.customer);
    const me = await (await page.request.get("/api/me")).json();
    expect(me.email).toBe(ACCOUNTS.customer);
    expect(me).not.toHaveProperty("passwordHash");

    const bad = await page.request.patch("/api/me", { data: { name: "x", phone: "123" } });
    expect(bad.status()).toBe(400);
    expect((await bad.json()).error.fields).toMatchObject({
      name: "validation.nameShort",
      phone: "validation.phoneInvalid",
    });

    const same = await page.request.patch("/api/me", {
      data: { name: me.name, phone: me.phone ?? "" },
    });
    expect(same.status()).toBe(200);
  });

  test("addresses: create, make default, delete; other people's addresses are 404", async ({
    browser,
  }) => {
    const admin = await browser.newPage();
    await login(admin, ACCOUNTS.admin);
    const theirs = await (await admin.request.post("/api/me/addresses", { data: ADDRESS })).json();
    expect(theirs.id).toBeTruthy();

    const me = await browser.newPage();
    await login(me, ACCOUNTS.customer);
    const before = (await (await me.request.get("/api/me/addresses")).json()).items.length;

    const created = await me.request.post("/api/me/addresses", { data: ADDRESS });
    expect(created.status()).toBe(201);
    const mine = await created.json();
    expect(mine).toMatchObject({ governorate: "ALX", userId: expect.any(String) });
    expect(
      (await me.request.post("/api/me/addresses", { data: { ...ADDRESS, phone: "5" } })).status(),
    ).toBe(400);
    expect(
      (
        await me.request.post("/api/me/addresses", { data: { ...ADDRESS, governorate: "ZZ" } })
      ).status(),
    ).toBe(400);

    const promoted = await me.request.patch(`/api/me/addresses/${mine.id}`, {
      data: { ...ADDRESS, street: "New street 5", isDefault: true },
    });
    expect(promoted.status()).toBe(200);
    const list = (await (await me.request.get("/api/me/addresses")).json()).items;
    expect(list[0]).toMatchObject({ id: mine.id, isDefault: true, street: "New street 5" });
    expect(list.filter((a: { isDefault: boolean }) => a.isDefault)).toHaveLength(1);

    // IDOR: someone else's address looks like it does not exist
    expect(
      (await me.request.patch(`/api/me/addresses/${theirs.id}`, { data: ADDRESS })).status(),
    ).toBe(404);
    expect((await me.request.delete(`/api/me/addresses/${theirs.id}`)).status()).toBe(404);

    expect((await me.request.delete(`/api/me/addresses/${mine.id}`)).status()).toBe(204);
    expect((await (await me.request.get("/api/me/addresses")).json()).items).toHaveLength(before);

    expect((await admin.request.delete(`/api/me/addresses/${theirs.id}`)).status()).toBe(204);
    await admin.close();
    await me.close();
  });

  test("orders: my list, one order with its timeline, and nobody else's", async ({ browser }) => {
    const me = await browser.newPage();
    await login(me, ACCOUNTS.customer);
    const mine = await (await me.request.get("/api/orders/me?pageSize=5")).json();
    expect(mine.total).toBeGreaterThan(0);
    expect(mine.items[0]).toMatchObject({
      orderNumber: expect.any(Number),
      totalCents: expect.any(Number),
    });
    const one = await (await me.request.get(`/api/orders/${mine.items[0].id}`)).json();
    expect(one.events.length).toBeGreaterThan(0);

    const staff = await browser.newPage();
    await login(staff, ACCOUNTS.viewer);
    const all = (
      await (await staff.request.get("/api/admin/orders?pageSize=25&sort=createdAt:asc")).json()
    ).items as {
      id: string;
      customerEmail: string;
    }[];
    const foreign = all.find((o) => o.customerEmail !== ACCOUNTS.customer)!;
    expect((await me.request.get(`/api/orders/${foreign.id}`)).status()).toBe(404);
    await staff.close();
    await me.close();
  });
});

test.describe("payment session API", () => {
  test("shows amount and time left to the buyer only", async ({ browser }) => {
    const buyer = await browser.newPage();
    await login(buyer, ACCOUNTS.customer);
    const res = await buyer.request.post("/api/checkout", {
      data: {
        locale: "en",
        paymentMethod: "CARD",
        address: ADDRESS,
        items: [{ variantId: await variantId(buyer.request), quantity: 1 }],
      },
    });
    expect(res.status()).toBe(200);
    const ref = ((await res.json()).url as string).split("/").pop()!;

    const session = await (await buyer.request.get(`/api/payments/sessions/${ref}`)).json();
    expect(session).toMatchObject({
      status: "PENDING",
      expired: false,
      amountCents: expect.any(Number),
    });
    expect(session.secondsLeft).toBeGreaterThan(1500);

    const other = await browser.newPage();
    await login(other, ACCOUNTS.admin);
    expect((await other.request.get(`/api/payments/sessions/${ref}`)).status()).toBe(404);
    await other.close();
    await buyer.close();
  });
});

test.describe("dashboard read APIs", () => {
  test("activity, order events, stock history and the email log", async ({ page }) => {
    expect((await page.request.get("/api/admin/activity")).status()).toBe(401);
    await login(page, ACCOUNTS.viewer);

    const activity = await (await page.request.get("/api/admin/activity?pageSize=5")).json();
    expect(activity).toMatchObject({ page: 1, pageSize: 5 });
    expect(activity.items.length).toBeGreaterThan(0);
    expect((await page.request.get("/api/admin/activity?kind=bogus")).status()).toBe(200); // bad filter = no filter

    const orders = (await (await page.request.get("/api/admin/orders?pageSize=1")).json()).items;
    const events = await (
      await page.request.get(`/api/admin/orders/${orders[0].id}/events`)
    ).json();
    expect(events.items.length).toBeGreaterThan(0);
    expect((await page.request.get("/api/admin/orders/nope/events")).status()).toBe(404);

    const product = await (await page.request.get("/api/products?pageSize=1")).json();
    const slug = (product.items ?? product.products)[0].slug;
    const detail = await (await page.request.get(`/api/products/${slug}`)).json();
    const logs = await (
      await page.request.get(`/api/admin/inventory/${detail.variants[0].id}/logs`)
    ).json();
    expect(logs).toMatchObject({ variant: { id: detail.variants[0].id } });
    expect(Array.isArray(logs.items)).toBe(true);

    const emails = await (await page.request.get("/api/admin/emails?pageSize=3")).json();
    expect(emails.items.length).toBeGreaterThan(0);
    expect(emails.items[0]).not.toHaveProperty("html");
    const one = await (await page.request.get(`/api/admin/emails/${emails.items[0].id}`)).json();
    expect(one.html).toContain("<");
  });
});

test.describe("demo login", () => {
  test("POST /api/auth/demo-login opens the demo customer or the read-only viewer", async ({
    request,
  }) => {
    const customer = await request.post("/api/auth/demo-login", {
      data: { as: "customer", locale: "en" },
    });
    expect(customer.status()).toBe(200);
    expect((await customer.json()).redirectTo).toBe("/en/account");
    expect((await (await request.get("/api/me")).json()).email).toBe(ACCOUNTS.customer);

    const viewer = await request.post("/api/auth/demo-login", { data: { as: "viewer" } });
    expect((await viewer.json()).redirectTo).toBe("/ar/admin");
    expect((await request.get("/api/admin/orders?pageSize=1")).status()).toBe(200);
    expect((await request.post("/api/admin/products", { data: {} })).status()).toBe(403);

    expect((await request.post("/api/auth/demo-login", { data: { as: "admin" } })).status()).toBe(
      400,
    );
  });
});

test.describe("API aliases from the blueprint", () => {
  test("newsletter, subscription interest and back-in-stock sign-ups", async ({ request }) => {
    const email = `alias-${Date.now()}@example.com`;
    expect(
      (await request.post("/api/newsletter", { data: { email, locale: "en" } })).status(),
    ).toBe(201);
    expect(
      (
        await request.post("/api/subscriptions/interest", { data: { email, locale: "ar" } })
      ).status(),
    ).toBe(201);
    expect(
      (await request.post("/api/newsletter", { data: { email: "nope", locale: "en" } })).status(),
    ).toBe(400);
    // a back-in-stock request needs a variant
    expect(
      (await request.post("/api/back-in-stock", { data: { email, locale: "en" } })).status(),
    ).toBe(400);
    const v = await variantId(request);
    expect(
      (
        await request.post("/api/back-in-stock", { data: { email, locale: "en", variantId: v } })
      ).status(),
    ).toBe(201);
  });

  test("events and the auth routes answer on their blueprint paths", async ({ request }) => {
    expect((await request.post("/api/events", { data: { type: "PRODUCT_VIEW" } })).status()).toBe(
      204,
    );
    expect(
      (await request.post("/api/auth/verify-email", { data: { token: "x" } })).status(),
    ).toBeGreaterThanOrEqual(400);
    expect(
      (
        await request.post("/api/auth/forgot-password", { data: { email: "nobody@example.com" } })
      ).status(),
    ).toBeLessThan(500);
    expect(
      (
        await request.post("/api/auth/reset-password", {
          data: { token: "x", password: "Password123" },
        })
      ).status(),
    ).toBeGreaterThanOrEqual(400);
  });
});

test.describe("scheduled jobs", () => {
  const auth = { authorization: "Bearer e2e-cron-secret" };

  test("run with the secret, each reporting what it did", async ({ request }) => {
    const expire = await request.get("/api/cron/expire-payments", { headers: auth });
    expect(expire.status()).toBe(200);
    expect((await expire.json()).ok).toBe(true);

    const sim = await request.get("/api/cron/simulate-day", { headers: auth });
    expect(sim.status()).toBe(200);
    expect((await sim.json()).result).toMatchObject({
      created: expect.any(Number),
      shipped: expect.any(Number),
      delivered: expect.any(Number),
    });

    // GET is what Vercel Cron sends; POST is for running it by hand
    const reset = await request.post("/api/cron/reset-demo", { headers: auth });
    expect(reset.status()).toBe(200);
    expect((await reset.json()).result).toMatchObject({ zones: 4, products: 40 });
  });

  test("refuse a wrong or missing secret", async ({ request }) => {
    for (const path of ["expire-payments", "simulate-day", "reset-demo"]) {
      expect((await request.get(`/api/cron/${path}`)).status(), path).toBe(401);
      expect(
        (
          await request.get(`/api/cron/${path}`, { headers: { authorization: "Bearer nope" } })
        ).status(),
      ).toBe(401);
    }
  });
});
