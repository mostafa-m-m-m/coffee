import { expect, test } from "@playwright/test";
import { ACCOUNTS, login } from "./helpers";

test.describe("login and sign-up frame", () => {
  test("two tabs, a show-password button and the one-click demo accounts", async ({ page }) => {
    await page.goto("/en/login");
    const tabs = page.getByRole("navigation", { name: "Sign in or create an account" });
    await expect(tabs.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByText("Exploring this demo?")).toBeVisible();
    await expect(page.getByRole("button", { name: "Try as customer" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Try the admin dashboard" })).toBeVisible();

    const password = page.getByLabel("Password", { exact: true });
    await password.fill("Secret123");
    await expect(password).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Show" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Hide" }).click();
    await expect(password).toHaveAttribute("type", "password");

    await tabs.getByRole("link", { name: "Sign up" }).click();
    await expect(page).toHaveURL(/\/en\/register$/);
    await expect(
      page
        .getByRole("navigation", { name: "Sign in or create an account" })
        .getByRole("link", { name: "Sign up" }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("a wrong password says so and stays on the page", async ({ page }) => {
    await page.goto("/en/login");
    await page.getByLabel("Email").fill(ACCOUNTS.customer);
    await page.getByLabel("Password", { exact: true }).fill("WrongPassword1");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.locator('p[role="alert"]')).toContainText("Incorrect email or password");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("my account", () => {
  test("a side menu, orders that open to their progress, and sign out", async ({ page }) => {
    await login(page, ACCOUNTS.customer, "/en/account");
    const menu = page.getByRole("navigation", { name: "Account sections" });
    for (const name of ["Orders", "Addresses", "Profile", "Language"]) {
      await expect(menu.getByRole("link", { name })).toBeVisible();
    }

    const first = page.locator("#orders details").first();
    await first.locator("summary").click();
    await expect(first.getByRole("list", { name: "Order progress" })).toBeVisible();
    await expect(
      first.getByText("Awaiting payment").or(first.getByText("Confirmed")).first(),
    ).toBeVisible();

    await menu.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();
  });
});

test.describe("storefront header", () => {
  test("the search icon opens a box that searches the catalog", async ({ page }) => {
    await page.goto("/en");
    await page.getByLabel("Search products").first().click();
    await page.getByRole("searchbox", { name: "Search products" }).fill("kenya");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/en\/products\?q=kenya/);
    await expect(page.getByText(/Kenya/).first()).toBeVisible();
  });
});

test.describe("dashboard details", () => {
  test("overview KPI sparklines and the signed-in role", async ({ page }) => {
    await login(page, ACCOUNTS.viewer, "/en/admin");
    const kpis = page.getByRole("region", { name: "Key metrics" });
    await expect(kpis.locator("svg")).toHaveCount(4);
    await expect(page.getByText("Viewer", { exact: true })).toBeVisible();
  });

  test("customers: governorate column and a side panel with order history", async ({ page }) => {
    await login(page, ACCOUNTS.viewer, "/en/admin/customers");
    await expect(page.getByRole("columnheader", { name: "Governorate" })).toBeVisible();
    await page.locator("tbody button").first().click();
    const panel = page.getByRole("dialog", { name: "Customer details" });
    await expect(panel).toBeVisible();
    await expect(panel.getByText("Order history")).toBeVisible();
    await expect(panel.getByText("Total spent")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
  });

  test("emails: pick a message and read it beside the list", async ({ page }) => {
    await login(page, ACCOUNTS.viewer, "/en/admin/emails");
    await expect(page.locator("iframe")).toBeVisible(); // the newest email is already open on the right
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
    if ((await rows.count()) > 1) {
      await rows.nth(1).getByRole("link", { name: "Preview" }).click();
      await expect(page).toHaveURL(/emails\?id=/);
      await expect(rows.nth(1).getByRole("link", { name: "Preview" })).toHaveAttribute(
        "aria-current",
        "true",
      );
    }
  });

  test("analytics: the comparison with the previous period can be switched off", async ({
    page,
  }) => {
    await login(page, ACCOUNTS.viewer, "/en/admin/analytics");
    const toggle = page.getByLabel("Compare to previous period");
    await expect(toggle).toBeChecked();
    await expect(page.getByText("vs previous period").first()).toBeVisible();
    await toggle.click(); // controlled by the URL, so the state follows the navigation
    await expect(page).toHaveURL(/compare=0/);
    await expect(page.getByText("vs previous period").first()).toBeHidden();
    await toggle.click();
    await expect(page).not.toHaveURL(/compare=0/);
  });

  test("orders: each active filter is a chip you can remove", async ({ page }) => {
    await login(page, ACCOUNTS.viewer, "/en/admin/orders?status=CONFIRMED,SHIPPED&method=COD");
    const chips = page.getByRole("list", { name: "Active filters" });
    await expect(chips.getByRole("button", { name: "Remove filter Confirmed" })).toBeVisible();
    await expect(
      chips.getByRole("button", { name: "Remove filter Cash on delivery" }),
    ).toBeVisible();
    await chips.getByRole("button", { name: "Remove filter Confirmed" }).click();
    await expect(page).not.toHaveURL(/CONFIRMED/);
    await expect(page).toHaveURL(/SHIPPED/);
    await chips.getByRole("button", { name: "Clear all" }).click();
    await expect(page).not.toHaveURL(/method=/);
  });
});

test.describe("home page product cards", () => {
  test("best sellers add a single-variant product to the cart in one click", async ({ page }) => {
    await page.goto("/en");
    const section = page
      .getByRole("region", { name: "Best sellers" })
      .or(page.locator("section", { has: page.getByRole("heading", { name: "Best sellers" }) }));
    const add = section.getByRole("button", { name: "Add to cart" }).first();
    if (!(await add.count()))
      test.skip(true, "no single-variant best seller on the shelf right now");
    await add.click();
    await expect(page.locator('[data-toast="success"]')).toBeVisible();
    await expect(page.getByRole("link", { name: /Cart/ }).first()).toContainText("1");
  });

  test("the whole card opens the product, and the card name is a real link", async ({ page }) => {
    await page.goto("/en");
    const link = page.locator('a[href^="/en/products/"]').first();
    const href = await link.getAttribute("href");
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
  });
});

test.describe("motion", () => {
  test("a visitor who prefers reduced motion gets no animation or transition time", async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("/en/products");
    const timing = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.className = "animate-pulse transition";
      document.body.append(probe);
      const css = getComputedStyle(probe);
      return { animation: css.animationDuration, transition: css.transitionDuration };
    });
    expect(parseFloat(timing.animation)).toBeLessThan(0.001);
    expect(parseFloat(timing.transition)).toBeLessThan(0.001);
    await ctx.close();
  });
});
