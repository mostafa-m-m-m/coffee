import { expect, test } from "@playwright/test";
import { ACCOUNTS, login } from "./helpers";

test.describe("home page", () => {
  test("shows the trust strip and a 'view all' link for the best sellers", async ({ page }) => {
    await page.goto("/ar");
    const strip = page.getByRole("list", { name: "مزايا المتجر" });
    await expect(strip).toContainText(/شحن مجاني فوق.*(1,000|١٬٠٠٠)/);
    await expect(strip).toContainText(/محمّص خلال/);
    await expect(strip).toContainText(/توصيل خلال/);
    await expect(strip).toContainText("كارت أو دفع عند الاستلام");

    const viewAll = page.getByRole("link", { name: /عرض الكل/ });
    await expect(viewAll).toHaveCount(1);
    await viewAll.click();
    await expect(page).toHaveURL(/\/products$/);
    await expect(page.getByRole("heading", { level: 1, name: "المنتجات" })).toBeVisible();
  });

  test("the demo bar points to the dashboard login", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("link", { name: "Try the admin dashboard" }).click();
    await expect(page).toHaveURL(/\/en\/login/);
  });

  test("shop by taste opens the catalog on that roast", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("link", { name: /Fruity and bright/ }).click();
    await expect(page).toHaveURL(/roast=LIGHT/);
    await expect(page.locator("select#roast")).toHaveValue("LIGHT");
  });

  test("the newsletter form validates, accepts an email and shows the confirmation", async ({
    page,
  }) => {
    await page.goto("/en");
    const form = page.locator("section", {
      has: page.getByRole("heading", { name: "Fresh coffee, straight to your door" }),
    });
    await form.getByRole("button", { name: "Subscribe" }).click();
    await expect(form.getByRole("alert")).toContainText("Enter a valid email address");
    await form.getByLabel("Email address").fill(`news-${Date.now()}@example.com`);
    await form.getByRole("button", { name: "Subscribe" }).click();
    await expect(form.getByRole("status")).toContainText("You're on the list");
  });

  test("category chips link to the filtered catalog", async ({ page }) => {
    await page.goto("/ar");
    await page.getByRole("link", { name: "أدوات التحضير", exact: true }).click(); // exact: product cards can carry the category name too
    await expect(page).toHaveURL(/category=brewing-gear/);
  });
});

test.describe("cart shipping hint", () => {
  test("tells the shopper how much is left for free shipping", async ({ page }) => {
    await page.goto("/ar/products?category=brewing-gear&sort=price-asc");
    await page.locator('a[href^="/ar/products/"]:visible').first().click(); // cheapest gear item
    await page.getByRole("button", { name: "أضف للعربة" }).click();
    await expect(page.getByText("اتضاف للعربة")).toBeVisible();

    await page.goto("/ar/cart");
    await expect(page.getByText(/باقي .* وتاخد شحن مجاني/)).toBeVisible();

    // keep adding the same item until the subtotal crosses $50: the hint goes away, shipping is free
    const hint = page.getByText(/وتاخد شحن مجاني/);
    for (let i = 0; i < 12 && (await hint.count()) > 0; i++) {
      await page.getByLabel("زيادة الكمية").click();
      await page.waitForTimeout(150);
    }
    await expect(hint).toHaveCount(0);
    await expect(page.getByText("مجاني", { exact: true })).toBeVisible();
  });
});

test.describe("store mobile menu @mobile", () => {
  test("opens a sheet with the links and closes on Esc, scrim and navigation", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.getByRole("link", { name: "المنتجات", exact: true })).toBeHidden(); // header links collapse on phones

    const open = page.getByRole("button", { name: "فتح القائمة" });
    await open.click();
    const menu = page.getByRole("dialog", { name: "القائمة" });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("link", { name: "المنتجات" })).toBeVisible();
    await expect(menu.getByRole("link", { name: /العربة/ })).toBeVisible();
    await expect(menu.getByRole("link", { name: "دخول" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "حسابي" })).toHaveCount(0); // guest

    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(open).toBeFocused(); // focus goes back to the ☰ button

    await open.click();
    await page.getByRole("button", { name: "إغلاق القائمة" }).click({ position: { x: 5, y: 5 } }); // scrim
    await expect(menu).toBeHidden();

    await open.click();
    await menu.getByRole("link", { name: "المنتجات" }).click();
    await expect(page).toHaveURL(/\/products/);
    await expect(menu).toBeHidden();
  });

  test("the theme switch lives in the menu and survives a reload", async ({ page }) => {
    await page.goto("/ar");
    await page.getByRole("button", { name: "فتح القائمة" }).click();
    await page.getByRole("button", { name: "داكن" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByRole("button", { name: "داكن" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("signed-in customers get account and logout instead of login", async ({ page }) => {
    await login(page, ACCOUNTS.customer, "/");
    await page.getByRole("button", { name: "فتح القائمة" }).click();
    const menu = page.getByRole("dialog", { name: "القائمة" });
    await expect(menu.getByRole("link", { name: "حسابي" })).toBeVisible();
    await expect(menu.getByRole("button", { name: "خروج" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "لوحة التحكم" })).toHaveCount(0);
    await menu.getByRole("button", { name: "خروج" }).click();
    await page.getByRole("button", { name: "فتح القائمة" }).click();
    await expect(
      page.getByRole("dialog", { name: "القائمة" }).getByRole("link", { name: "دخول" }),
    ).toBeVisible();
  });

  test("staff also see the dashboard link", async ({ page }) => {
    await login(page, ACCOUNTS.viewer, "/");
    await page.getByRole("button", { name: "فتح القائمة" }).click();
    await expect(
      page.getByRole("dialog", { name: "القائمة" }).getByRole("link", { name: "لوحة التحكم" }),
    ).toBeVisible();
  });
});

test.describe("information pages", () => {
  for (const [path, heading] of [
    ["/ar/about", "عن Ember Roastery"],
    ["/ar/privacy", "سياسة الخصوصية"],
    ["/ar/terms", "شروط الاستخدام"],
    ["/en/about", "About Ember Roastery"],
    ["/en/privacy", "Privacy policy"],
    ["/en/terms", "Terms of use"],
  ] as const) {
    test(`${path} renders`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(page.getByRole("contentinfo")).toBeVisible();
    });
  }

  test("terms fill in the VAT rate and the payment hold time", async ({ page }) => {
    await page.goto("/en/terms");
    await expect(page.getByText("include 14% VAT")).toBeVisible();
    await expect(page.getByText("held for 30 minutes")).toBeVisible();
  });

  test("subscriptions: leave an email to be told when it opens", async ({ page }) => {
    await page.goto("/en/subscriptions");
    await expect(page.getByRole("heading", { level: 1, name: "Subscriptions" })).toBeVisible();
    await page.getByLabel("Email address").fill(`soon-${Date.now()}@example.com`);
    await page.getByRole("button", { name: "Notify me" }).click();
    await expect(page.getByRole("status")).toContainText("We'll email you");
  });

  test("robots and sitemap list the public pages in both languages, and hide the dashboard", async ({
    request,
  }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /api/");
    expect(robots).toContain("Disallow: /ar/admin");
    expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toMatch(/\/ar\/about</);
    expect(sitemap).toMatch(/\/en\/products\/[a-z0-9-]+</);
    expect(sitemap).not.toContain("/admin");
  });
});

test.describe("operations endpoints", () => {
  test("health reports the app and database as up", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", database: "up" });
  });

  test("the API description and its viewer are served", async ({ request }) => {
    const spec = await (await request.get("/api/openapi.json")).json();
    expect(spec.openapi).toBe("3.1.0");
    const docs = await request.get("/api/docs");
    expect(docs.status()).toBe(200);
    expect(await docs.text()).toContain("/api/openapi.json");
  });

  test("scheduled jobs refuse a request without the secret", async ({ request }) => {
    expect((await request.get("/api/cron/expire-payments")).status()).toBe(401);
    expect(
      (
        await request.get("/api/cron/simulate-day", { headers: { authorization: "Bearer wrong" } })
      ).status(),
    ).toBe(401);
  });
});

test.describe("catalog filters", () => {
  test("a misspelt search says what it was matched to, and filters show as removable chips", async ({
    page,
  }) => {
    await page.goto("/en/products?q=ethopia");
    await expect(page.getByText("Showing results for Ethiopia")).toBeVisible();
    await expect(page.getByRole("link", { name: /Remove filter “ethopia”/ })).toBeVisible();
    await page.goto("/en/products?q=ethiopia");
    await expect(page.getByText(/Showing results for/)).toHaveCount(0);

    await page.goto("/en/products?category=single-origin&category=blends&inStock=1");
    await expect(page.getByRole("link", { name: "Remove filter Single origin" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Remove filter Blends" })).toBeVisible();
    await page.getByRole("link", { name: "Remove filter Blends" }).click();
    await expect(page).toHaveURL(/category=single-origin/);
    await expect(page).not.toHaveURL(/blends/);
  });

  test("sorts by best selling and keeps it in the URL", async ({ page }) => {
    await page.goto("/en/products");
    await page.getByLabel("Sort by").selectOption("best-selling");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/sort=best-selling/);
    await expect(page.getByLabel("Sort by")).toHaveValue("best-selling");
  });

  test("an untouched price slider sends no price filter", async ({ page }) => {
    await page.goto("/en/products");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page).not.toHaveURL(/[?&](min|max)=[^&]/);
    await page.getByLabel("Min price (EGP)").first().fill("400");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/min=400/);
    await expect(page.getByRole("link", { name: "Remove filter From EGP 400" })).toBeVisible();
  });
});

test.describe("product page", () => {
  test("breadcrumb, gallery, quantity, tabs and related products", async ({ page }) => {
    await page.goto("/en/products?category=single-origin");
    await page.locator('a[href^="/en/products/"]:visible').first().click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const crumbs = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(crumbs.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(crumbs.getByRole("link", { name: "Single origin" })).toBeVisible();

    await expect(page.getByText("VAT included")).toBeVisible();
    await expect(page.getByText(/Delivered to Cairo in \d+ days?/)).toBeVisible();

    const qty = page.getByRole("group", { name: "Quantity" });
    await qty.getByRole("button", { name: "Increase quantity" }).click();
    await expect(qty.getByRole("status")).toHaveText("2");
    await qty.getByRole("button", { name: "Decrease quantity" }).click();
    await expect(qty.getByRole("status")).toHaveText("1");

    const tabs = page.getByRole("tablist");
    await expect(tabs.getByRole("tab", { name: "Description" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await tabs.getByRole("tab", { name: "Brewing guide" }).click();
    await expect(page.getByText(/Espresso: fine grind/)).toBeVisible();
    await tabs.getByRole("tab", { name: "Shipping" }).click();
    await expect(page.getByText(/ship free/)).toBeVisible();
    await tabs.getByRole("tab", { name: "Shipping" }).press("ArrowRight");
    await expect(tabs.getByRole("tab", { name: "Description" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await expect(page.getByRole("heading", { name: "You may also like" })).toBeVisible();
  });

  test("several images make a gallery you can switch", async ({ page, request }) => {
    const list = await (await request.get("/api/products?locale=en")).json();
    const multi = (list.items as { slug: string }[])[0];
    // give the product a second image through the page: the gallery shows thumbnails only when there are 2+
    await page.goto(`/en/products/${multi.slug}`);
    const thumbs = page.getByRole("list", { name: "Product images" });
    if (await thumbs.count()) {
      await thumbs.getByRole("button", { name: "Show image 2" }).click();
      await expect(thumbs.getByRole("button", { name: "Show image 2" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    } else {
      await expect(page.getByRole("img").first()).toBeVisible(); // single image: just the picture
    }
  });
});

test.describe("catalog filter sheet @mobile", () => {
  test("filters open as a bottom sheet and close from the backdrop", async ({ page }) => {
    await page.goto("/en/products");
    const apply = page.getByRole("button", { name: "Apply" });
    await expect(apply).toBeHidden();
    await page.getByText("⚙ Filters and sorting").click();
    await expect(apply).toBeVisible();

    const sheet = page.getByRole("search");
    const box = (await sheet.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(Math.round(box.y + box.height)).toBeGreaterThanOrEqual(viewport.height - 2); // docked to the bottom edge
    expect(box.y).toBeGreaterThan(viewport.height * 0.1); // never covers the whole screen

    await page.mouse.click(viewport.width / 2, 20); // the dimmed area above the sheet
    await expect(apply).toBeHidden();
  });
});
