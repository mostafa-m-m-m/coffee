// Takes the screenshots shown in the README into docs/screenshots.
//   npm run build && RATE_LIMIT_DISABLED=true npm start     (production server, seeded database)
//   npm run screenshots [baseUrl]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const out = fileURLToPath(new URL("../docs/screenshots/", import.meta.url));
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });

async function session(role, { dark = false, mobile = false } = {}) {
  const ctx = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 860 },
    deviceScaleFactor: mobile ? 2 : 1,
    colorScheme: dark ? "dark" : "light",
    locale: "ar-EG",
  });
  const page = await ctx.newPage();
  if (role) {
    await page.request.post(`${base}/api/auth/demo-login`, {
      data: { as: role, locale: "ar" },
      headers: { origin: base },
    });
  }
  return { ctx, page };
}

async function shot(name, path, opts = {}, role = null) {
  const { ctx, page } = await session(role, opts);
  await page.goto(`${base}${path}`);
  await page.waitForLoadState("networkidle");
  const suffix = `${opts.mobile ? "mobile" : "desktop"}-${opts.dark ? "dark" : "light"}`;
  await page.screenshot({ path: `${out}${name}.${suffix}.png`, fullPage: !opts.mobile });
  await ctx.close();
  console.log(`${name}.${suffix}`);
}

const slug = (await (await fetch(`${base}/api/products?locale=en`)).json()).items[0].slug;

// storefront
await shot("store-home", "/ar");
await shot("store-home", "/ar", { dark: true });
await shot("store-home", "/ar", { mobile: true });
await shot("store-products", "/ar/products?category=single-origin");
await shot("store-products", "/ar/products", { mobile: true });
await shot("store-product", `/ar/products/${slug}`);
await shot("store-product", `/en/products/${slug}`, { dark: true });
await shot("login", "/ar/login");
await shot("login", "/en/login", { dark: true });
await shot("account", "/ar/account", {}, "customer");
await shot("store-cart", "/ar/cart");
// dashboard
await shot("admin-overview", "/ar/admin", {}, "viewer");
await shot("admin-overview", "/ar/admin", { dark: true }, "viewer");
await shot("admin-orders", "/ar/admin/orders", {}, "viewer");
await shot("admin-orders", "/ar/admin/orders", { mobile: true }, "viewer");
await shot("admin-analytics", "/ar/admin/analytics", {}, "viewer");
await shot("admin-analytics", "/ar/admin/analytics", { dark: true }, "viewer");
await shot("admin-customers", "/ar/admin/customers", {}, "viewer");
await shot("admin-products", "/ar/admin/products", {}, "viewer");
await shot("admin-activity", "/ar/admin/activity", {}, "viewer");
await shot("admin-shipping", "/ar/admin/shipping", {}, "viewer");
await shot("admin-inventory", "/ar/admin/inventory", {}, "viewer");
await shot("admin-emails", "/ar/admin/emails", {}, "viewer");
await shot("admin-overview-en", "/en/admin", {}, "viewer");

await browser.close();
