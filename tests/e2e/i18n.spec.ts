import { expect, test } from "@playwright/test";
import { ACCOUNTS, login } from "./helpers";

test.describe("language", () => {
  test("each locale sets lang, direction and its own copy", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("قهوة مختصة");

    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Specialty coffee");
  });

  test("unprefixed URLs redirect to a locale, and protected ones keep it in the login redirect", async ({
    page,
  }) => {
    await page.goto("/products");
    await expect(page).toHaveURL(/\/ar\/products$/);
    await page.goto("/admin/orders");
    await expect(page).toHaveURL(/\/ar\/login\?callbackUrl=%2Far%2Fadmin%2Forders/);
  });

  test("the switcher keeps the page and the query string", async ({ page }) => {
    await page.goto("/ar/products?category=brewing-gear&sort=price-asc");
    await page
      .getByRole("group", { name: "اللغة" })
      .getByRole("button", { name: "English" })
      .click();
    await expect(page).toHaveURL(/\/en\/products\?category=brewing-gear&sort=price-asc$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1, name: "Products" })).toBeVisible();
    await expect(page.getByLabel("Sort by")).toHaveValue("price-asc");

    await page
      .getByRole("group", { name: "Language" })
      .getByRole("button", { name: "العربية" })
      .click();
    await expect(page).toHaveURL(/\/ar\/products\?category=brewing-gear&sort=price-asc$/);
    await expect(page.getByRole("heading", { level: 1, name: "المنتجات" })).toBeVisible();
  });

  test("a URL that matches no route answers 404 in both languages", async ({ page }) => {
    const res = await page.goto("/en/a/b/c/d");
    expect(res?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { level: 1, name: "This page doesn't exist" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: "الصفحة دي مش موجودة" }),
    ).toBeVisible();
  });

  test("the choice is remembered when you open the bare site again", async ({ page }) => {
    await page.goto("/en");
    await page.goto("/");
    await expect(page).toHaveURL(/\/en$/);
  });

  test("prices are in EGP: Arabic-Indic digits in Arabic, Latin digits in English", async ({
    page,
  }) => {
    await page.goto("/ar/products");
    await expect(page.locator("main")).toContainText(/[٠-٩]+.*ج\.م/);
    await expect(page.locator("main")).not.toContainText(/\bEGP\b/);
    await page.goto("/en/products");
    await expect(page.locator("main")).toContainText(/EGP\s?[\d,]+/);
    await expect(page.locator("body")).not.toContainText(/[٠-٩]/);
  });
});

test.describe("English storefront", () => {
  test("validation, API errors and the guest checkout redirect are all in English", async ({
    page,
  }) => {
    await page.goto("/en/login");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("Enter a valid email address")).toBeVisible();

    await page.getByLabel("Email").fill("customer@coffee.test");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("Incorrect email or password")).toBeVisible();

    await page.goto("/en/register");
    await page.getByLabel("Name").fill("Existing Customer");
    await page.getByLabel("Email").fill("customer@coffee.test");
    await page.getByLabel("Password").fill("Password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("This email is already registered")).toBeVisible();

    await page.goto("/en/checkout");
    await expect(page).toHaveURL(/\/en\/login\?callbackUrl=/);
  });

  test("browse, add to cart (toast), cart totals and shipping hint", async ({ page }) => {
    await page.goto("/en/products?category=brewing-gear&sort=price-asc");
    await expect(page.getByText(/\d+ products?/)).toBeVisible();
    await page.locator('a[href^="/en/products/"]:visible').first().click();
    await page.getByRole("button", { name: "Add to cart" }).first().click();
    await expect(page.locator('[data-toast="success"]')).toHaveText(/Added to your cart/);
    await expect(page.getByRole("link", { name: /Cart, 1 item/ })).toBeVisible();

    await page.goto("/en/cart");
    await expect(page.getByRole("heading", { name: "Order summary" })).toBeVisible();
    await expect(page.getByText(/more for free shipping/)).toBeVisible();
    await expect(page.getByText("Subtotal")).toBeVisible();
  });

  test("customers see their account in English, with localized dates and statuses", async ({
    page,
  }) => {
    await login(page, ACCOUNTS.customer, "/en/account");
    await expect(page.getByRole("heading", { level: 1, name: "My account" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "My orders" })).toBeVisible();
    // the status sits in each order's summary row (the progress list inside is collapsed)
    await expect(
      page
        .locator("#orders summary")
        .getByText(/(Awaiting payment|Confirmed|Shipped|Delivered|Cancelled)$/)
        .first(),
    ).toBeVisible();
  });
});

test.describe("English dashboard", () => {
  test("overview, orders table, status labels and the order timeline", async ({ page }) => {
    await login(page, ACCOUNTS.viewer, "/en/admin");
    await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
    await expect(page.getByText("Average order value")).toBeVisible();
    await expect(page.getByText("View-only mode — editing is disabled")).toBeVisible();

    await page.goto("/en/admin/orders");
    await expect(page.getByRole("columnheader", { name: /Customer/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Last 7 days" })).toBeVisible();
    await expect(page.getByText(/Showing 1–25 of [\d,]+ orders/)).toBeVisible();

    await page.locator("tbody a").first().click();
    await expect(page.getByRole("heading", { level: 1, name: /Order #\d+/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Shipping address" })).toBeVisible();
    await expect(page.getByText("View-only mode: editing is disabled.")).toBeVisible();
  });

  test("admins get a styled confirmation (not window.confirm) before a destructive change", async ({
    page,
  }) => {
    await login(page, ACCOUNTS.admin, "/en/admin/orders?status=CONFIRMED&payment=PAID");
    await page.locator("tbody a").first().click();
    await page.getByLabel("Change status to").selectOption("CANCELLED");
    await page.getByRole("button", { name: "Apply" }).click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Stock will be returned");
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused(); // the safe choice has focus
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Confirmed").first()).toBeVisible(); // nothing changed
  });
});

test.describe("phone layout @mobile", () => {
  test("product page: price and Add to cart stay pinned to the bottom edge", async ({ page }) => {
    await page.goto("/en/products?category=brewing-gear");
    await page.locator('a[href^="/en/products/"]:visible').first().click();
    const bar = page
      .locator("div.fixed.bottom-0")
      .filter({ has: page.getByRole("button", { name: "Add to cart" }) });
    await expect(bar).toBeVisible();
    const box = (await bar.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(Math.round(box.y + box.height)).toBe(viewport.height);
    await bar.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.locator('[data-toast="success"]')).toBeVisible();
  });

  test("cart pins the total and checkout; checkout folds the summary and pins Pay", async ({
    page,
  }) => {
    await page.goto("/en/products?category=brewing-gear");
    await page.locator('a[href^="/en/products/"]:visible').first().click();
    await page.getByRole("button", { name: "Add to cart" }).last().click();

    await page.goto("/en/cart");
    const cartBar = page.locator("div.fixed.bottom-0").filter({ hasText: "Total" });
    await expect(cartBar).toBeVisible();
    await expect(cartBar.getByRole("link", { name: "Checkout" })).toBeVisible();

    await login(page, ACCOUNTS.customer, "/en/checkout");
    const summary = page.locator("details", { hasText: "Order summary" });
    await expect(summary).toBeVisible();
    await expect(summary).not.toHaveAttribute("open", "");
    await summary.locator("summary").click();
    await expect(summary).toContainText("Total");
    const pay = page.getByRole("button", { name: "Continue to payment" });
    const box = (await pay.boundingBox())!;
    expect(box.y + box.height).toBeGreaterThan(page.viewportSize()!.height - 80);
  });
});
