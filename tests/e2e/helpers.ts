import { expect, type Page } from "@playwright/test";

export const ACCOUNTS = {
  admin: "admin@coffee.test",
  viewer: "viewer@coffee.test",
  customer: "customer@coffee.test",
} as const;

export async function login(
  page: Page,
  email: string,
  callbackUrl = "/",
  password = "Password123",
) {
  await page.goto(`/ar/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await page.getByLabel("الإيميل").fill(email);
  await page.getByLabel("كلمة المرور").fill(password);
  await page.getByRole("button", { name: "دخول", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

/** "EGP 1,250" / "١٬٢٥٠ ج.م." / "$12.50" -> 1250 (Arabic digits and separators included). */
export function parseMoney(text: string): number {
  const latin = text
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[٬,\s]/g, "")
    .replace("٫", ".");
  const m = latin.match(/\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : Number.NaN;
}

/** On phones the filters sit behind a toggle; on desktop this is a no-op. */
export async function openFilters(page: Page, label = "الفلاتر") {
  const toggle = page.locator("label", { hasText: label }).first();
  if (await toggle.isVisible()) await toggle.click();
}

/** The table first renders skeleton rows; wait until a real order link is there. */
export async function waitForOrderRows(page: Page) {
  await expect(page.locator("tbody a").first()).toBeVisible();
}
