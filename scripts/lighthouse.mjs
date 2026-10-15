// Lighthouse on the main pages, in both themes, phone and desktop.
//   npm run build && RATE_LIMIT_DISABLED=true npm start     (production server)
//   npm run lighthouse [baseUrl]                            (default http://localhost:3000)
// Prints a table and writes docs/lighthouse.json. The dashboard page is audited signed in as the viewer.
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";
import { writeFileSync } from "node:fs";

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");

async function viewerCookie() {
  const res = await fetch(`${base}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: base },
    body: JSON.stringify({ email: "viewer@coffee.test", password: "Password123" }),
  });
  return res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

const slug = (await (await fetch(`${base}/api/products?locale=en`)).json()).items[0].slug;
const cookie = await viewerCookie();
const pages = [
  { name: "home", path: "/ar" },
  { name: "products", path: "/ar/products" },
  { name: "product", path: `/ar/products/${slug}` },
  { name: "cart", path: "/ar/cart" },
  { name: "login", path: "/ar/login" },
  { name: "home-en", path: "/en" },
  { name: "dashboard", path: "/ar/admin", cookie },
];

const rows = [];
for (const theme of ["light", "dark"]) {
  // the theme follows the browser's color scheme, so each theme gets its own browser
  const chrome = await launch({
    chromeFlags: [
      "--headless=new",
      "--no-sandbox",
      `--blink-settings=preferredColorScheme=${theme === "dark" ? 1 : 0}`,
    ],
  });
  for (const form of ["mobile", "desktop"]) {
    for (const p of pages) {
      const flags = {
        port: chrome.port,
        output: "json",
        logLevel: "error",
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
        formFactor: form,
        screenEmulation:
          form === "desktop"
            ? { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false }
            : undefined,
        throttlingMethod: "simulate",
        extraHeaders: p.cookie ? { Cookie: p.cookie } : undefined,
      };
      // the desktop preset has its own, faster throttling; phones use Lighthouse's default (simulated slow 4G, 4x CPU)
      const result = await lighthouse(
        `${base}${p.path}`,
        flags,
        form === "desktop" ? desktopConfig : undefined,
      );
      const c = result.lhr.categories;
      const m = result.lhr.audits;
      rows.push({
        page: p.name,
        form,
        theme,
        performance: Math.round(c.performance.score * 100),
        accessibility: Math.round(c.accessibility.score * 100),
        bestPractices: Math.round(c["best-practices"].score * 100),
        seo: p.cookie ? null : Math.round(c.seo.score * 100),
        lcpMs: Math.round(m["largest-contentful-paint"].numericValue),
        cls: Number(m["cumulative-layout-shift"].numericValue.toFixed(3)),
        tbtMs: Math.round(m["total-blocking-time"].numericValue),
      });
      console.log(JSON.stringify(rows.at(-1)));
    }
  }
  await chrome.kill();
}
writeFileSync(new URL("../docs/lighthouse.json", import.meta.url), JSON.stringify(rows, null, 2));
console.table(rows);
