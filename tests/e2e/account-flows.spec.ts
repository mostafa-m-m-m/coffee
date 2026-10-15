import { expect, test, type Browser, type Page } from "@playwright/test";
import { ACCOUNTS, login } from "./helpers";

/** Opens the newest email to `to` of this type in the dashboard and returns the link inside it (path + query only). */
async function linkFromEmail(browser: Browser, to: string, linkText: RegExp) {
  const ctx = await browser.newContext();
  const admin = await ctx.newPage();
  await login(admin, ACCOUNTS.admin, "/ar/admin/emails");
  const row = admin.locator("tbody tr", { hasText: to }).first();
  await expect(row).toBeVisible();
  await row.getByRole("link", { name: "معاينة" }).click();
  const href = await admin
    .frameLocator("iframe")
    .getByRole("link", { name: linkText })
    .getAttribute("href");
  await ctx.close();
  const url = new URL(href!);
  return url.pathname + url.search;
}

async function signUp(page: Page, email: string) {
  const res = await page.request.post("/api/auth/register", {
    data: { name: "Flow Tester", email, password: "Password123", locale: "ar" },
  });
  expect(res.status()).toBe(201);
}

test.describe("account emails", () => {
  test("forgot password: request, open the emailed link, choose a new password, sign in with it", async ({
    page,
    browser,
  }) => {
    const email = `reset-${Date.now()}@example.com`;
    await signUp(page, email);

    await page.goto("/ar/login");
    await page.getByRole("link", { name: "نسيت كلمة المرور؟" }).click();
    await expect(page).toHaveURL(/\/ar\/forgot-password/);
    await page.getByLabel("الإيميل").fill(email);
    await page.getByRole("button", { name: "ابعت لينك الاسترجاع" }).click();
    await expect(page.getByRole("status")).toContainText("لينك الاسترجاع في الطريق");

    const link = await linkFromEmail(browser, email, /اختار كلمة مرور جديدة/);
    expect(link).toMatch(/^\/ar\/reset-password\?token=[0-9a-f]{64}$/);

    await page.goto(link);
    await page.getByLabel("كلمة المرور").fill("short");
    await page.getByLabel("كلمة المرور").blur();
    await expect(page.getByText(/8 حروف|٨ حروف|على الأقل/)).toBeVisible();
    await page.getByLabel("كلمة المرور").fill("BrandNew123");
    await page.getByRole("button", { name: "حفظ كلمة المرور" }).click();
    await expect(page.getByRole("status")).toContainText("اتغيرت كلمة المرور");

    // the link is spent
    await page.goto(link);
    await page.getByLabel("كلمة المرور").fill("Another1234");
    await page.getByRole("button", { name: "حفظ كلمة المرور" }).click();
    await expect(page.locator("p[role=alert]")).toContainText("مش صالح");

    await login(page, email, "/ar/account", "BrandNew123");
    await expect(page.getByRole("heading", { level: 1, name: "حسابي" })).toBeVisible();
  });

  test("asking for a reset for an unknown address looks exactly the same", async ({ page }) => {
    await page.goto("/ar/forgot-password");
    await page.getByLabel("الإيميل").fill(`nobody-${Date.now()}@example.com`);
    await page.getByRole("button", { name: "ابعت لينك الاسترجاع" }).click();
    await expect(page.getByRole("status")).toContainText("لينك الاسترجاع في الطريق");
  });

  test("sign-up sends a confirmation email, and its link confirms the address", async ({
    page,
    browser,
  }) => {
    const email = `verify-${Date.now()}@example.com`;
    await signUp(page, email);
    const link = await linkFromEmail(browser, email, /تأكيد الإيميل/);
    expect(link).toMatch(/^\/ar\/verify-email\?token=/);
    await page.goto(link);
    await expect(page.getByRole("status")).toContainText("تم تأكيد إيميلك");
  });

  test("a broken or missing link is explained, not crashed", async ({ page }) => {
    await page.goto("/ar/verify-email?token=nope");
    await expect(page.locator("p[role=alert]")).toContainText("مش صالح");
    await page.goto("/ar/reset-password");
    await expect(page.locator("p[role=alert]")).toContainText("ناقصه الرمز");
  });

  test("placing a cash-on-delivery order records the confirmation email", async ({
    page,
    browser,
  }) => {
    await login(page, ACCOUNTS.customer, "/ar");
    const product = await (await page.request.get("/api/products?limit=1")).json();
    const slug = (product.items ?? product)[0].slug as string;
    const detail = await (await page.request.get(`/api/products/${slug}`)).json();
    const res = await page.request.post("/api/checkout", {
      data: {
        locale: "ar",
        paymentMethod: "COD",
        items: [{ variantId: detail.variants[0].id, quantity: 1 }],
        address: {
          fullName: "Test Buyer",
          phone: "01000000000",
          governorate: "C",
          area: "Maadi",
          street: "Road 9",
          building: "12",
        },
      },
    });
    expect(res.ok()).toBe(true);

    const ctx = await browser.newContext();
    const admin = await ctx.newPage();
    await login(admin, ACCOUNTS.admin, "/ar/admin/emails");
    await expect(admin.locator("tbody tr", { hasText: "تأكيد الأوردر" }).first()).toBeVisible({
      timeout: 15_000,
    });
    await ctx.close();
  });
});
