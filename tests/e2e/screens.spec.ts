import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ACCOUNTS, login } from "./helpers";

/**
 * Every screen, in both languages and both themes: no axe violations (WCAG 2.1 A/AA),
 * no horizontal page scroll, and nothing logged to the console. Runs on desktop, and again
 * on a phone (the @mobile copy below).
 */

const LOCALES = ["ar", "en"] as const;
const THEMES = ["light", "dark"] as const;
type Locale = (typeof LOCALES)[number];

type Screen = {
  name: string;
  path: (l: Locale, ids: Ids) => string;
  /** screens that need their own data (a fresh payment session...) build their URL here instead */
  setup?: (page: Page, l: Locale, ids: Ids) => Promise<string>;
  as?: keyof typeof ACCOUNTS;
  cart?: boolean;
  /** something that proves the screen finished loading */
  ready: (page: Page) => ReturnType<Page["locator"]>;
};
type Ids = { slug: string; variantId: string; orderId: string; productId: string };

const heading = (page: Page) => page.getByRole("heading", { level: 1 }).first();

const SCREENS: Screen[] = [
  { name: "home", path: (l) => `/${l}`, ready: (p) => p.locator("main h1") },
  { name: "about", path: (l) => `/${l}/about`, ready: heading },
  { name: "subscriptions", path: (l) => `/${l}/subscriptions`, ready: heading },
  { name: "privacy", path: (l) => `/${l}/privacy`, ready: heading },
  { name: "terms", path: (l) => `/${l}/terms`, ready: heading },
  { name: "forgot password", path: (l) => `/${l}/forgot-password`, ready: heading },
  {
    name: "admin activity",
    path: (l) => `/${l}/admin/activity`,
    as: "admin",
    ready: (p) => p.locator("tbody tr").first(),
  },
  {
    name: "admin inventory",
    path: (l) => `/${l}/admin/inventory`,
    as: "admin",
    ready: (p) => p.locator("tbody tr").first(),
  },
  {
    name: "admin shipping",
    path: (l) => `/${l}/admin/shipping`,
    as: "admin",
    ready: (p) => p.locator("tbody tr").first(),
  },
  {
    name: "admin emails",
    path: (l) => `/${l}/admin/emails`,
    as: "admin",
    ready: (p) => p.locator("tbody a").first(),
  },
  {
    name: "products",
    path: (l) => `/${l}/products`,
    ready: (p) => p.locator('a[href*="/products/"]').first(),
  },
  { name: "product detail", path: (l, i) => `/${l}/products/${i.slug}`, ready: heading },
  { name: "cart", path: (l) => `/${l}/cart`, cart: true, ready: (p) => p.locator("main aside") },
  {
    name: "checkout",
    path: (l) => `/${l}/checkout`,
    as: "customer",
    cart: true,
    ready: (p) => p.locator("form input#fullName"),
  },
  {
    name: "payment page",
    path: (l) => `/${l}`,
    setup: (page, l, i) => placeOrder(page, l, i, "CARD"),
    as: "customer",
    ready: (p) => p.locator("form input#number:visible"),
  },
  {
    name: "order confirmation",
    path: (l) => `/${l}`,
    setup: (page, l, i) => placeOrder(page, l, i, "COD"),
    as: "customer",
    ready: heading,
  },
  { name: "login", path: (l) => `/${l}/login`, ready: heading },
  { name: "register", path: (l) => `/${l}/register`, ready: heading },
  {
    name: "account",
    path: (l) => `/${l}/account`,
    as: "customer",
    ready: (p) => p.locator("main h2").first(),
  },
  { name: "not found", path: (l) => `/${l}/products/this-does-not-exist`, ready: heading },
  {
    name: "admin overview",
    path: (l) => `/${l}/admin`,
    as: "admin",
    ready: (p) => p.locator("main h2").first(),
  },
  {
    name: "admin orders",
    path: (l) => `/${l}/admin/orders`,
    as: "admin",
    ready: (p) => p.locator("tbody a").first(),
  },
  {
    name: "admin order detail",
    path: (l, i) => `/${l}/admin/orders/${i.orderId}`,
    as: "admin",
    ready: heading,
  },
  {
    name: "admin products",
    path: (l) => `/${l}/admin/products`,
    as: "admin",
    ready: (p) => p.locator("tbody a").first(),
  },
  {
    name: "admin new product",
    path: (l) => `/${l}/admin/products/new`,
    as: "admin",
    ready: (p) => p.locator('input[id^="name-"]:visible'),
  },
  {
    name: "admin edit product",
    path: (l, i) => `/${l}/admin/products/${i.productId}`,
    as: "admin",
    ready: (p) => p.locator('input[id^="name-"]:visible'),
  },
  {
    name: "admin customers",
    path: (l) => `/${l}/admin/customers`,
    as: "admin",
    ready: (p) => p.locator("tbody a, tbody td").first(),
  },
  {
    name: "admin analytics",
    path: (l) => `/${l}/admin/analytics`,
    as: "admin",
    ready: (p) => p.locator("svg.recharts-surface").first(),
  },
];

let ids: Ids;

/** Places an order through the real checkout API and returns the page the shopper is sent to. */
async function placeOrder(page: Page, locale: Locale, i: Ids, paymentMethod: "CARD" | "COD") {
  const res = await page.request.post("/api/checkout", {
    data: {
      locale,
      paymentMethod,
      items: [{ variantId: i.variantId, quantity: 1 }],
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
  return (await res.json()).url as string;
}
test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto("/ar/products");
  const slug = (await page.locator('a[href*="/ar/products/"]').first().getAttribute("href"))!
    .split("/")
    .pop()!;
  await login(page, ACCOUNTS.admin, "/ar/admin/orders");
  await page.locator("tbody a").first().waitFor();
  const orderId = (await page.locator("tbody a").first().getAttribute("href"))!.split("/").pop()!;
  await page.goto("/ar/admin/products");
  await page.locator("tbody a").first().waitFor();
  const productId = (await page.locator("tbody a").first().getAttribute("href"))!.split("/").pop()!;
  const product = await (await page.request.get(`/api/products/${slug}`)).json();
  ids = { slug, variantId: product.variants[0].id, orderId, productId };
  await page.close();
});

async function addOneToCart(page: Page, locale: Locale) {
  await page.goto(`/${locale}/products/${ids.slug}`);
  await page
    .getByRole("button", { name: locale === "ar" ? "أضف للعربة" : "Add to cart" })
    .first()
    .click();
  await expect(page.locator('[data-toast="success"]')).toBeVisible();
}

function register(tag: "" | "@mobile") {
  for (const locale of LOCALES) {
    for (const theme of THEMES) {
      test.describe(`${tag} screens · ${locale} · ${theme}`.trim(), () => {
        for (const screen of SCREENS) {
          test(`${screen.name}`, async ({ page }) => {
            const problems: string[] = [];
            page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
            page.on("console", (m) => {
              if (m.type() === "error") problems.push(`console: ${m.text()}`);
            });

            await page.addInitScript((t) => {
              // sandboxed frames (the e-mail preview) have no localStorage
              try {
                localStorage.setItem("theme", t);
              } catch {}
            }, theme);
            if (screen.as) await login(page, ACCOUNTS[screen.as], `/${locale}`);
            if (screen.cart) await addOneToCart(page, locale);

            await page.goto(
              screen.setup ? await screen.setup(page, locale, ids) : screen.path(locale, ids),
            );
            await expect(screen.ready(page)).toBeVisible();
            await page.waitForLoadState("networkidle");

            const html = page.locator("html");
            await expect(html).toHaveAttribute("lang", locale);
            await expect(html).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
            if (theme === "dark") await expect(html).toHaveClass(/\bdark\b/);

            const overflow = await page.evaluate(
              () => document.documentElement.scrollWidth - window.innerWidth,
            );
            expect(overflow, "horizontal page scroll").toBeLessThanOrEqual(1);

            const { violations } = await new AxeBuilder({ page })
              // the e-mail preview is a sandboxed frame (no scripts allowed), which axe cannot enter by design
              .exclude("iframe[sandbox]")
              .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
              .analyze();
            expect(
              violations.map(
                (v) =>
                  `${v.id}: ${v.nodes
                    .slice(0, 2)
                    .map((n) => n.target.join(" "))
                    .join(" | ")}`,
              ),
            ).toEqual([]);

            expect(
              problems.filter((p) => !/favicon|Failed to load resource.*40[134]/.test(p)),
            ).toEqual([]);
          });
        }
      });
    }
  }
}

register("");
// the same matrix on a phone (the mobile project only runs @mobile tests)
test.describe("phone @mobile", () => register("@mobile"));
