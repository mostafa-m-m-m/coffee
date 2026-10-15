import { expect, test } from "@playwright/test";
import { ACCOUNTS, login } from "./helpers";

test.describe("security headers", () => {
  test("pages carry a strict CSP and the usual hardening headers", async ({ request }) => {
    const res = await request.get("/ar");
    const h = res.headers();
    const csp = h["content-security-policy"];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain("cdn.jsdelivr.net");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toContain("camera=()");
  });

  test("only the API docs page may load the Swagger UI CDN", async ({ request }) => {
    const docs = (await request.get("/api/docs")).headers()["content-security-policy"];
    expect(docs).toContain("https://cdn.jsdelivr.net");
    const api = (await request.get("/api/health")).headers()["content-security-policy"];
    expect(api).not.toContain("cdn.jsdelivr.net");
  });

  test("the app still runs under the policy: no CSP violations on core pages", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (m) => {
      if (/content security policy/i.test(m.text())) violations.push(m.text());
    });
    for (const path of ["/ar", "/en/products", "/ar/login"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
    }
    expect(violations).toEqual([]);
  });
});

test.describe("access control", () => {
  const ADMIN_GETS = [
    "/api/admin/orders",
    "/api/admin/customers",
    "/api/admin/analytics/summary",
    "/api/admin/export/orders",
  ];

  test("signed-out visitors get 401 from every dashboard API and from checkout", async ({
    request,
  }) => {
    for (const path of ADMIN_GETS) expect((await request.get(path)).status(), path).toBe(401);
    expect((await request.post("/api/checkout", { data: {} })).status()).toBe(401);
    expect((await request.get("/api/orders/anything/invoice")).status()).toBe(401);
  });

  test("customers cannot reach the dashboard API", async ({ page }) => {
    await login(page, ACCOUNTS.customer);
    for (const path of ADMIN_GETS) expect((await page.request.get(path)).status(), path).toBe(403);
    expect((await page.request.post("/api/admin/products", { data: {} })).status()).toBe(403);
  });

  test("viewers can read but never write", async ({ page }) => {
    await login(page, ACCOUNTS.viewer);
    const list = await page.request.get("/api/admin/orders?pageSize=1");
    expect(list.status()).toBe(200);
    const id = (await list.json()).items[0].id as string;

    const writes = [
      page.request.patch(`/api/admin/orders/${id}`, { data: { status: "CANCELLED" } }),
      page.request.post(`/api/admin/orders/${id}/refund`),
      page.request.post("/api/admin/orders/bulk", { data: { ids: [id], status: "SHIPPED" } }),
      page.request.post("/api/admin/products", { data: {} }),
      page.request.patch(`/api/admin/products/${id}`, { data: {} }),
      page.request.delete(`/api/admin/products/${id}`),
      page.request.patch(`/api/admin/inventory/${id}`, { data: { stock: 1, note: "x" } }),
    ];
    for (const res of await Promise.all(writes)) expect(res.status()).toBe(403);
  });

  test("a customer cannot download someone else's invoice (IDOR)", async ({ browser }) => {
    // an order id that belongs to somebody else, read as staff
    const staff = await browser.newPage();
    await login(staff, ACCOUNTS.viewer);
    const rows = (
      await (
        await staff.request.get("/api/admin/orders?pageSize=25&status=DELIVERED&sort=createdAt:asc")
      ).json()
    ).items as {
      id: string;
      customerEmail?: string;
    }[];
    const foreign = rows.find((r) => r.customerEmail !== ACCOUNTS.customer)!;
    expect(foreign).toBeTruthy();
    await staff.close();

    const me = await browser.newPage();
    await login(me, ACCOUNTS.customer);
    const res = await me.request.get(`/api/orders/${foreign.id}/invoice`);
    expect([403, 404]).toContain(res.status());
    expect(res.headers()["content-type"] ?? "").not.toContain("pdf");
    await me.close();
  });

  test("image upload signing is admin-only and reports when uploads are off", async ({
    browser,
  }) => {
    const anon = await browser.newPage();
    expect((await anon.request.post("/api/admin/uploads/sign")).status()).toBe(401);
    await anon.close();

    const viewer = await browser.newPage();
    await login(viewer, ACCOUNTS.viewer);
    expect((await viewer.request.post("/api/admin/uploads/sign")).status()).toBe(403);
    await viewer.close();

    const admin = await browser.newPage();
    await login(admin, ACCOUNTS.admin);
    const res = await admin.request.post("/api/admin/uploads/sign");
    // 200 when Cloudinary is configured, 503 when it is not: never a signature without keys
    expect([200, 503]).toContain(res.status());
    if (res.status() === 200) expect(JSON.stringify(await res.json())).not.toMatch(/secret/i);
    await admin.close();
  });

  test("cron jobs and the payment callback refuse unsigned requests", async ({ request }) => {
    expect((await request.get("/api/cron/simulate-day")).status()).toBe(401);
    const cb = await request.post("/api/payments/callback", {
      data: { paymentRef: "x", status: "paid" },
    });
    expect([400, 401, 403]).toContain(cb.status());
  });
});
