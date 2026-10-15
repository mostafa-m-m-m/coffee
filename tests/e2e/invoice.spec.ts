import { expect, test, type Page } from "@playwright/test";
import { ACCOUNTS, login } from "./helpers";

async function placeOrder(page: Page, paymentMethod: "COD" | "CARD", locale: "ar" | "en" = "ar") {
  const products = await (await page.request.get("/api/products?limit=1")).json();
  const slug = (products.items ?? products)[0].slug as string;
  const detail = await (await page.request.get(`/api/products/${slug}`)).json();
  const res = await page.request.post("/api/checkout", {
    data: {
      locale,
      paymentMethod,
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
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()).orderId as string;
}

test.describe("invoice PDF", () => {
  test("the owner downloads a real PDF, in the order's language or the one asked for", async ({
    page,
  }) => {
    await login(page, ACCOUNTS.customer, "/ar");
    const id = await placeOrder(page, "COD");

    const res = await page.request.get(`/api/orders/${id}/invoice`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/pdf");
    expect(res.headers()["content-disposition"]).toContain("invoice-");
    const body = await res.body();
    expect(body.subarray(0, 5).toString()).toBe("%PDF-");

    const english = await page.request.get(`/api/orders/${id}/invoice?lang=en`);
    expect(english.status()).toBe(200);
    expect((await english.body()).length).not.toBe(body.length); // a different document
  });

  test("somebody else's order and unpaid card orders have none", async ({ page, browser }) => {
    await login(page, ACCOUNTS.customer, "/ar");
    const cod = await placeOrder(page, "COD");
    const card = await placeOrder(page, "CARD"); // awaiting payment

    expect((await page.request.get(`/api/orders/${card}/invoice`)).status()).toBe(404);

    const guest = await browser.newContext();
    expect((await guest.request.get(`/api/orders/${cod}/invoice`)).status()).toBe(401);
    await guest.close();

    // another customer: register one on the fly
    const other = await browser.newContext();
    const email = `invoice-${Date.now()}@example.com`;
    await other.request.post("/api/auth/register", {
      data: { name: "Other Person", email, password: "Password123" },
    });
    const otherPage = await other.newPage();
    await login(otherPage, email, "/ar");
    expect((await otherPage.request.get(`/api/orders/${cod}/invoice`)).status()).toBe(404);
    await other.close();
  });

  test("staff can open any order's invoice from the dashboard", async ({ page }) => {
    await login(page, ACCOUNTS.admin, "/ar/admin/orders?status=CONFIRMED");
    await page.locator("tbody a").first().click();
    const link = page.getByRole("link", { name: "الفاتورة (PDF)" });
    await expect(link).toBeVisible();
    const href = await link.getAttribute("href");
    const res = await page.request.get(href!);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/pdf");
  });

  test("my account offers the invoice for real orders only", async ({ page }) => {
    await login(page, ACCOUNTS.customer, "/ar");
    await placeOrder(page, "COD");
    await page.goto("/ar/account");
    // orders open to show their details; open them all
    await page
      .locator("#orders details")
      .evaluateAll((els) => els.forEach((e) => ((e as HTMLDetailsElement).open = true)));
    await expect(page.getByRole("link", { name: "الفاتورة (PDF)" }).first()).toBeVisible();
    // an order awaiting payment is recognized by its summary row (the progress list inside lists every step)
    const awaiting = page
      .locator("#orders summary", { hasText: "في انتظار الدفع" })
      .first()
      .locator("xpath=ancestor::li[1]");
    if (await awaiting.count())
      await expect(awaiting.getByRole("link", { name: "الفاتورة (PDF)" })).toHaveCount(0);
  });
});
