import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { ACCOUNTS, login } from "./helpers";

// the dashboard counts days on the Cairo calendar, so "today" must too (UTC is a day behind after 21:00)
const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Africa/Cairo" });

async function funnel(page: Page) {
  const res = await page.request.get(`/api/admin/analytics/funnel?from=${today()}&to=${today()}`);
  expect(res.ok()).toBe(true);
  return Object.fromEntries(
    ((await res.json()) as { stage: string; sessions: number }[]).map((s) => [s.stage, s.sessions]),
  );
}

async function adminPage(ctx: BrowserContext) {
  const page = await ctx.newPage();
  await login(page, ACCOUNTS.admin, "/ar/admin");
  return page;
}

test.describe("funnel tracking", () => {
  test("a visit that views a product, adds it and starts checkout shows up in the funnel", async ({
    page,
    browser,
  }) => {
    const adminCtx = await browser.newContext();
    const admin = await adminPage(adminCtx);
    const before = await funnel(admin);

    // a brand-new anonymous visit
    await page.goto("/ar/products?category=brewing-gear");
    await page.locator('a[href^="/ar/products/"]:visible').first().click();
    await expect(page.getByRole("button", { name: "أضف للعربة" }).first()).toBeVisible();
    await page.getByRole("button", { name: "أضف للعربة" }).first().click();
    await expect(page.getByText("اتضاف للعربة")).toBeVisible();
    await expect
      .poll(async () => (await page.context().cookies()).some((c) => c.name === "ember_sid"))
      .toBe(true);

    await login(page, ACCOUNTS.customer, "/ar/checkout");
    await expect(page.getByRole("heading", { name: "عنوان الشحن" })).toBeVisible();

    await expect
      .poll(async () => {
        const now = await funnel(admin);
        return [
          now.PRODUCT_VIEW > before.PRODUCT_VIEW,
          now.ADD_TO_CART > before.ADD_TO_CART,
          now.CHECKOUT_START > before.CHECKOUT_START,
        ];
      })
      .toEqual([true, true, true]);
    await adminCtx.close();
  });

  test("the browser can't fake an order, and a stranger can't read the funnel", async ({
    page,
  }) => {
    const bad = await page.request.post("/api/track", { data: { type: "ORDER_PLACED" } });
    expect(bad.status()).toBe(400);
    expect(
      (
        await page.request.get(`/api/admin/analytics/funnel?from=${today()}&to=${today()}`)
      ).status(),
    ).toBe(401);
  });

  test("Do Not Track switches the page events off", async ({ browser }) => {
    const ctx = await browser.newContext();
    await ctx.addInitScript(() =>
      Object.defineProperty(Navigator.prototype, "doNotTrack", { get: () => "1" }),
    );
    const page = await ctx.newPage();
    const calls: string[] = [];
    page.on("request", (r) => r.url().includes("/api/track") && calls.push(r.url()));
    await page.goto("/ar/products?category=brewing-gear");
    await page.locator('a[href^="/ar/products/"]:visible').first().click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(calls).toHaveLength(0);
    await ctx.close();
  });
});

test.describe("analytics page", () => {
  test("shows the funnel, abandoned carts, governorates and payment split", async ({ page }) => {
    await login(page, ACCOUNTS.viewer, "/ar/admin/analytics");
    await expect(page.getByRole("region", { name: "قمع الشراء" })).toContainText("شاف منتج");
    await expect(page.getByRole("region", { name: "العربات المتروكة" })).toBeVisible();
    await expect(page.getByRole("region", { name: "المبيعات حسب المحافظة" })).toContainText(
      "القاهرة",
    );
    await expect(page.getByRole("region", { name: "كارت ولا دفع عند الاستلام" })).toContainText(
      /دفع عند الاستلام/,
    );
  });
});

test.describe("back in stock", () => {
  test("a visitor asks to be told, and gets an email once the item is restocked", async ({
    page,
    browser,
  }) => {
    const adminCtx = await browser.newContext();
    const admin = await adminPage(adminCtx);

    // pick a variant and sell it out through the dashboard
    const list = await (
      await admin.request.get("/api/products?limit=1&category=brewing-gear")
    ).json();
    const slug = (list.items ?? list)[0].slug as string;
    const detail = await (await admin.request.get(`/api/products/${slug}`)).json();
    const variant = detail.variants[0] as { id: string; stock: number };
    const original = variant.stock;
    const setStock = (stock: number) =>
      admin.request.patch(`/api/admin/inventory/${variant.id}`, {
        data: { stock, note: "e2e back in stock" },
      });
    expect((await setStock(0)).ok()).toBe(true);

    try {
      const email = `wait-${Date.now()}@example.com`;
      await page.goto(`/ar/products/${slug}`);
      await expect(page.getByText("نفذ من المخزون")).toBeVisible();
      await page.getByLabel("البريد الإلكتروني").fill(email);
      await page.getByRole("button", { name: "بلّغني لما يرجع" }).click();
      await expect(
        page.getByRole("status").filter({ hasText: "هنبعتلك إيميل أول ما يرجع" }),
      ).toBeVisible();

      expect((await setStock(5)).ok()).toBe(true);
      await admin.goto("/ar/admin/emails");
      const row = admin.locator("tbody tr", { hasText: email });
      await expect(async () => {
        await admin.reload();
        await expect(row.first()).toContainText("المنتج رجع");
      }).toPass({ timeout: 20_000 });
    } finally {
      await setStock(original);
      await adminCtx.close();
    }
  });
});
