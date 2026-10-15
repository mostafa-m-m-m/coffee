import { expect, test } from "@playwright/test";
import { ACCOUNTS, login, openFilters } from "./helpers";

const AR_DIGITS = "[\\d٠-٩]";

/** Puts one gear item in the cart, signs in as the demo customer and opens checkout. */
async function checkoutWithOneItem(page: import("@playwright/test").Page) {
  // the demo customer's saved cart grows with every earlier run: start from an empty one
  await login(page, ACCOUNTS.customer, "/");
  await page.evaluate(() => localStorage.removeItem("coffee-cart")); // the merged copy on this device
  await page.goto("/ar");
  const cleared = await page.request.put("/api/cart", { data: { items: [] } });
  expect(cleared.ok()).toBe(true);
  await page.goto("/ar/products?category=brewing-gear");
  await page.locator('a[href^="/ar/products/"]:visible').first().click();
  await page.getByRole("button", { name: "أضف للعربة" }).click();
  await expect(page.getByText("اتضاف للعربة")).toBeVisible();
  await page.goto("/ar/checkout");
  await expect(page.getByRole("heading", { name: "عنوان الشحن" })).toBeVisible();
}

async function fillAddress(page: import("@playwright/test").Page) {
  await page.getByLabel("الاسم الكامل").fill("Test Buyer");
  await page.getByLabel("رقم الموبايل").fill("01000000000");
  await page.getByLabel("المحافظة").selectOption("C");
  await page.getByLabel("المنطقة").fill("المعادي");
  await page.getByLabel("الشارع").fill("شارع 9");
  await page.getByLabel("رقم المبنى والشقة").fill("12");
}

test.describe("storefront", () => {
  test("browse, filter, pick a variant and add to the cart", async ({ page }) => {
    await page.goto("/ar");
    await page.getByRole("link", { name: "تصفح المنتجات" }).click();
    await expect(page).toHaveURL(/\/products$/);

    // filters live in the URL
    await openFilters(page);
    await page.getByRole("checkbox", { name: "أدوات التحضير" }).check();
    await page.getByRole("button", { name: "تطبيق" }).click();
    await expect(page).toHaveURL(/category=brewing-gear/);
    // the active filter shows as a chip that removes itself
    await expect(page.getByRole("link", { name: /شيل الفلتر أدوات التحضير/ })).toBeVisible();
    await expect(
      page.locator("p:visible", { hasText: new RegExp(`^\\s*${AR_DIGITS}+\\s*منتج\\S*\\s*$`) }),
    ).toHaveText(/(12|١٢)\s*منتج/);

    // taste filter
    await page.goto("/ar/products");
    await openFilters(page);
    await page.getByRole("combobox", { name: "الذوق" }).selectOption("citrus");
    await page.getByRole("button", { name: "تطبيق" }).click();
    await expect(page).toHaveURL(/note=citrus/);
    await expect(page.locator('a[href^="/ar/products/"]:visible').first()).toBeVisible();

    // empty search shows an empty state with a way out
    await page.goto("/ar/products?q=zzzzzz");
    await expect(page.getByText("مفيش منتجات مطابقة")).toBeVisible();
    await page.getByRole("link", { name: "مسح الفلاتر" }).click();
    await expect(page).toHaveURL(/\/products$/);

    // product page: the price follows the selected variant
    await page.goto("/ar/products?category=single-origin");
    await page.locator('a[href^="/ar/products/"]:visible').first().click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const radios = page.getByRole("radio");
    await expect(radios.first()).toBeAttached(); // the product page has loaded
    expect(await radios.count()).toBeGreaterThan(1);
    const price = page.locator("p.text-2xl");
    const before = await price.textContent();
    await page.locator("label:has(input[name=variant])").last().click();
    await expect(price).not.toHaveText(before!);

    await page.getByRole("button", { name: "أضف للعربة" }).click();
    await expect(page.getByText("اتضاف للعربة")).toBeVisible();
    await expect(page.getByRole("link", { name: /العربة، منتج واحد/ })).toBeVisible();
  });

  test("the cart is editable, persists across reloads, and empties cleanly", async ({ page }) => {
    await page.goto("/ar/products?category=brewing-gear");
    await page.locator('a[href^="/ar/products/"]:visible').first().click();
    await page.getByRole("button", { name: "أضف للعربة" }).click();
    await page.getByRole("button", { name: "أضف للعربة" }).click();

    await page.goto("/ar/cart");
    await expect(page.getByLabel("زيادة الكمية")).toBeVisible();
    await expect(page.locator('[aria-live="polite"]').filter({ hasText: /^2$/ })).toBeVisible();

    await page.getByLabel("تقليل الكمية").click();
    await expect(page.locator('[aria-live="polite"]').filter({ hasText: /^1$/ })).toBeVisible();

    await page.reload(); // guest cart is kept locally
    await expect(page.getByRole("link", { name: "إتمام الشراء" })).toBeVisible();

    await page.getByRole("button", { name: "حذف" }).click();
    await expect(page.getByText("العربة فاضية")).toBeVisible();
  });

  test("unknown product shows the not-found page and is kept out of search indexes", async ({
    page,
  }) => {
    // Known limitation: the page streams, so the status line is 200 (soft 404); robots=noindex covers SEO.
    await page.goto("/ar/products/this-does-not-exist");
    await expect(page.getByText("الصفحة دي مش موجودة")).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    const unknownPage = await page.goto("/ar/definitely/not/a/page");
    expect(unknownPage?.status()).toBe(404); // truly unknown routes do answer 404
  });

  test("guests are sent to login at checkout, and their cart follows them into the account", async ({
    page,
  }) => {
    await page.goto("/ar/products?category=brewing-gear");
    await page.locator('a[href^="/ar/products/"]:visible').first().click();
    await page.getByRole("button", { name: "أضف للعربة" }).click();
    await expect(page.getByText("اتضاف للعربة")).toBeVisible();

    await page.goto("/ar/checkout");
    await expect(page).toHaveURL(/\/login\?callbackUrl=/);

    await login(page, ACCOUNTS.customer, "/cart");
    await expect(page.getByRole("link", { name: "إتمام الشراء" })).toBeVisible();
  });

  test("checkout validates the address on blur and shows the shipping price for the governorate", async ({
    page,
  }) => {
    await checkoutWithOneItem(page);

    // errors appear when the user leaves a field, not while typing
    const phone = page.getByLabel("رقم الموبايل");
    await phone.fill("12");
    await expect(page.getByText(/رقم موبايل مصري صحيح/)).toHaveCount(0);
    await phone.blur();
    await expect(page.getByText(/رقم موبايل مصري صحيح/)).toBeVisible();

    await fillAddress(page);
    // the zone's fee and delivery time appear as soon as a governorate is chosen
    await expect(page.getByRole("status").filter({ hasText: "القاهرة الكبرى" })).toContainText(
      /(2|٢) أيام|يومين/,
    );
    await page.getByLabel("المحافظة").selectOption("ASN");
    await expect(page.getByRole("status").filter({ hasText: "الصعيد والصحراء" })).toBeVisible();
  });

  test("cash on delivery: the order is confirmed at once and stock is taken", async ({ page }) => {
    await checkoutWithOneItem(page);
    await fillAddress(page);
    await page.getByRole("radio", { name: /الدفع عند الاستلام/ }).check();
    await page.getByRole("button", { name: "تأكيد الأوردر" }).click();

    await expect(page).toHaveURL(/\/checkout\/success\?order=/);
    await expect(page.getByRole("heading", { level: 1, name: /تم تأكيد الأوردر/ })).toBeVisible();
    await expect(page.getByText("الدفع عند الاستلام — غير مدفوع")).toBeVisible();
  });

  test("card: a declined test card can be retried, then the payment confirms the order", async ({
    page,
  }) => {
    await checkoutWithOneItem(page);
    await fillAddress(page);
    await page.getByRole("button", { name: "المتابعة للدفع" }).click();

    await expect(page).toHaveURL(/\/pay\/[0-9a-f]{32}$/);
    await expect(page.getByRole("note")).toContainText("دفع تجريبي");
    const pay = async (number: string) => {
      await page.getByLabel("رقم الكارت").fill(number);
      await page.getByLabel("تاريخ الانتهاء").fill("12/30");
      await page.getByLabel("CVC").fill("123");
      await page.getByLabel("الاسم على الكارت").fill("Test Buyer");
      await page.getByRole("button", { name: /^ادفع/ }).click();
    };

    await pay("4000000000000002");
    await expect(page.getByRole("alert").filter({ hasText: "الكارت اترفض" })).toBeVisible();
    await page.getByLabel("رقم الكارت").fill("1111 1111 1111 1111");
    await page.getByRole("button", { name: /^ادفع/ }).click();
    await expect(page.getByText(/ده مش كارت تجريبي/)).toBeVisible();

    await pay("4242424242424242");
    await expect(page).toHaveURL(/\/checkout\/success\?order=/);
    await expect(page.getByRole("heading", { level: 1, name: /تم تأكيد الأوردر/ })).toBeVisible();
    await expect(page.getByText("بطاقة (دفع تجريبي) — مدفوع")).toBeVisible();
  });

  test("a payment page belongs to the person who placed the order", async ({ page, browser }) => {
    await checkoutWithOneItem(page);
    await fillAddress(page);
    await page.getByRole("button", { name: "المتابعة للدفع" }).click();
    await expect(page).toHaveURL(/\/pay\//);
    const url = page.url();

    const other = await browser.newPage();
    await login(other, ACCOUNTS.admin, "/");
    await other.goto(url);
    await expect(other.getByText("الصفحة دي مش موجودة")).toBeVisible(); // not found, never the payment form
    await expect(other.getByLabel("رقم الكارت")).toHaveCount(0);
    await other.close();
  });

  test("viewer accounts are read-only and cannot check out", async ({ page }) => {
    await login(page, ACCOUNTS.viewer, "/checkout");
    await expect(page.getByText("للاستعراض فقط")).toBeVisible();
  });
});
