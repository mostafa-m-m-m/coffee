// Records the README's short animation: a customer orders a bag with cash on delivery, then the
// dashboard shows that order at the top of the list. Needs ffmpeg.
//   npm run build && RATE_LIMIT_DISABLED=true npm start     (production server, seeded database)
//   npm run record-flow [baseUrl]                           (writes docs/flow.gif)
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const dir = mkdtempSync(join(tmpdir(), "flow-"));
const size = { width: 1100, height: 720 };

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({
  viewport: size,
  recordVideo: { dir, size },
  locale: "en-US",
});
const page = await ctx.newPage();
const pause = (ms) => page.waitForTimeout(ms);
const demo = (as) =>
  page.request.post(`${base}/api/auth/demo-login`, {
    data: { as, locale: "en" },
    headers: { origin: base },
  });

// 1. the customer
await demo("customer");
await page.goto(`${base}/en/products?inStock=1`);
await pause(900);
await page.locator('a[href^="/en/products/"]').first().click();
await page.getByRole("button", { name: "Add to cart" }).first().waitFor();
await pause(900);
await page.getByRole("button", { name: "Add to cart" }).first().click();
await pause(900);
await page.goto(`${base}/en/checkout`);
await page.getByLabel("Cash on delivery").check();
await page.getByRole("button", { name: "Place order" }).waitFor();
await pause(900);
await page.getByRole("button", { name: "Place order" }).click();
await page.getByRole("heading", { name: /confirmed/i }).waitFor();
await pause(1500);

// 2. the dashboard, as the read-only viewer
await demo("viewer");
await page.goto(`${base}/en/admin/orders`);
await page.locator("tbody a").first().waitFor();
await pause(2200);

await ctx.close();
await browser.close();

const video = readdirSync(dir).find((f) => f.endsWith(".webm"));
const gif = fileURLToPath(new URL("../docs/flow.gif", import.meta.url));
execFileSync("ffmpeg", [
  "-y",
  "-i",
  join(dir, video),
  "-vf",
  "fps=8,scale=900:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4",
  gif,
]);
rmSync(dir, { recursive: true, force: true });
console.log("wrote docs/flow.gif");
