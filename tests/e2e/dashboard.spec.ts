import { expect, test } from "@playwright/test";
import { ACCOUNTS, login, openFilters, parseMoney, waitForOrderRows } from "./helpers";

test.describe("dashboard access", () => {
  test("the demo button signs a reviewer in as a read-only viewer", async ({ page }) => {
    await page.goto("/ar/login");
    await page.getByRole("button", { name: "جرّب لوحة التحكم" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByText("وضع المشاهدة")).toBeVisible();
    await expect(page.getByText("المبيعات", { exact: true }).first()).toBeVisible();
  });

  test("the demo button signs a reviewer in as a customer with saved orders", async ({ page }) => {
    await page.goto("/ar/login");
    await page.getByRole("button", { name: "جرّب كعميل" }).click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByRole("heading", { level: 2, name: "أوردراتي" })).toBeVisible();
  });

  test("customers cannot open the dashboard", async ({ page }) => {
    await login(page, ACCOUNTS.customer);
    await page.goto("/ar/admin/orders");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("inventory history", () => {
  test("lists stock movements and filters them by reason", async ({ page }) => {
    await login(page, ACCOUNTS.viewer, "/ar/admin/inventory");
    await expect(page.getByRole("heading", { level: 1, name: "تاريخ المخزون" })).toBeVisible();
    await expect(page.locator("tbody tr").first()).toBeVisible();
    await page.getByRole("link", { name: "بيع", exact: true }).click();
    await expect(page).toHaveURL(/reason=SALE/);
    const reasons = await page.locator("tbody tr td:nth-child(4)").allTextContents();
    expect(reasons.length).toBeGreaterThan(0);
    expect(new Set(reasons)).toEqual(new Set(["بيع"]));
  });
});

test.describe("product images", () => {
  test("pasted URLs show as thumbnails you can remove; uploads explain when they are off", async ({
    page,
  }) => {
    await login(page, ACCOUNTS.admin, "/ar/admin/products/new");
    await expect(page.getByText("0 من 5 صور")).toBeVisible();
    const configured = await page.getByLabel("ارفع صور").count();
    if (!configured) await expect(page.getByText(/الرفع محتاج حساب Cloudinary/)).toBeVisible();

    await page
      .getByLabel("روابط الصور (رابط في كل سطر)")
      .fill("/img/products/ethiopia-yirgacheffe.png");
    await expect(page.getByText("1 من 5 صور")).toBeVisible();
    await page.getByRole("button", { name: "احذف الصورة 1" }).click();
    await expect(page.getByText("0 من 5 صور")).toBeVisible();
  });
});

test.describe("products table", () => {
  test("shows a thumbnail per product and filters by visibility", async ({ page }) => {
    await login(page, ACCOUNTS.viewer, "/en/admin/products");
    await expect(page.locator("tbody tr").first().locator("img")).toBeAttached();
    const nav = page.getByRole("navigation", { name: "Show" });
    await nav.getByRole("link", { name: "Hidden" }).click();
    await expect(page).toHaveURL(/show=hidden/);
    await expect(nav.getByRole("link", { name: "Hidden" })).toHaveAttribute("aria-current", "page");
    // every row in this view is hidden
    for (const row of await page.locator("tbody tr").all())
      await expect(row).toContainText("Hidden");
    // read-only: no switches for the viewer
    await expect(page.getByRole("switch")).toHaveCount(0);
  });

  test("an admin hides a product with the row switch and shows it again", async ({ page }) => {
    await login(page, ACCOUNTS.admin, "/en/admin/products");
    const first = page.getByRole("switch").first();
    await expect(first).toHaveAttribute("aria-checked", "true");
    await first.click();
    await expect(page.getByRole("switch").first()).toHaveAttribute("aria-checked", "false");
    await page.goto("/en/admin/activity?kind=product");
    await expect(page.locator("tbody tr").first()).toContainText(/hid the product/);
    await page.goto("/en/admin/products");
    // the product we just hid sorts by creation date, so it is still first: put it back
    const again = page.getByRole("switch").first();
    await expect(again).toHaveAttribute("aria-checked", "false");
    await again.click();
    await expect(page.getByRole("switch").first()).toHaveAttribute("aria-checked", "true");
  });
});

test.describe("activity log", () => {
  test("shows who changed what, and filters by type", async ({ page }) => {
    await login(page, ACCOUNTS.viewer, "/ar/admin/activity");
    await expect(page.getByRole("heading", { level: 1, name: "سجل النشاط" })).toBeVisible();
    await expect(page.locator("tbody tr").first()).toBeVisible();
    await page.getByLabel("النوع").selectOption("order");
    await page.getByRole("button", { name: "تطبيق" }).click();
    await expect(page).toHaveURL(/kind=order/);
    await expect(page.locator("tbody tr").first()).toContainText(/أوردر/);
  });
});

test.describe.serial("shipping zone editing", () => {
  const row = (page: import("@playwright/test").Page) =>
    page.locator("tbody tr", { hasText: "القاهرة الكبرى" });

  test("the viewer sees the zones but no edit buttons", async ({ page }) => {
    await login(page, ACCOUNTS.viewer, "/ar/admin/shipping");
    await expect(row(page)).toBeVisible();
    await expect(page.getByRole("button", { name: /تعديل/ })).toHaveCount(0);
  });

  test("an admin changes a fee, it lands in the activity log, and can put it back", async ({
    page,
  }) => {
    await login(page, ACCOUNTS.admin, "/ar/admin/shipping");
    const original = parseMoney((await row(page).locator("td").nth(1).innerText()) ?? "");

    for (const fee of [original + 1, original]) {
      await row(page).getByRole("button", { name: /تعديل/ }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("سعر الشحن (ج.م)").fill(String(fee));
      await dialog.getByRole("button", { name: "حفظ" }).click();
      await expect(dialog).toBeHidden();
      await expect
        .poll(async () => parseMoney(await row(page).locator("td").nth(1).innerText()))
        .toBe(fee);
    }

    await page.goto("/ar/admin/activity?kind=shipping");
    await expect(page.locator("tbody tr").first()).toContainText("القاهرة الكبرى");
  });

  test("a zone cannot leave a governorate uncovered", async ({ page }) => {
    await login(page, ACCOUNTS.admin, "/ar/admin/shipping");
    await row(page).getByRole("button", { name: /تعديل/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("القاهرة", { exact: true }).uncheck();
    await dialog.getByRole("button", { name: "حفظ" }).click();
    await expect(dialog.getByRole("alert")).toContainText("كل محافظة لازم تتبع منطقة");
  });
});

test.describe("shipping zones", () => {
  test("lists every zone with its fee, delivery time and governorates", async ({ page }) => {
    await login(page, ACCOUNTS.viewer, "/ar/admin/shipping");
    await expect(page.getByRole("heading", { level: 1, name: "مناطق الشحن" })).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(4);
    await expect(page.getByRole("cell", { name: "القاهرة الكبرى" })).toBeVisible();
    await expect(page.getByRole("cell", { name: /القاهرة.*الجيزة/ })).toBeVisible();
  });
});

test.describe("orders table", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ACCOUNTS.viewer, "/admin/orders");
    await expect(page.getByRole("table")).toBeVisible();
    await waitForOrderRows(page);
  });

  test("filters by status and keeps the filter in the URL", async ({ page }) => {
    await openFilters(page);
    await page.getByLabel("مؤكد", { exact: true }).click();
    await expect(page.getByLabel("مؤكد", { exact: true })).toBeChecked();
    await expect(page).toHaveURL(/status=CONFIRMED/);

    // the table keeps showing the previous page until the filtered data arrives, so poll:
    // eventually no row may carry any other status
    const others = page
      .locator("tbody tr")
      .filter({ hasText: /في انتظار الدفع|تم الشحن|تم التسليم|ملغي/ });
    await expect(others).toHaveCount(0);
    await expect(page.locator("tbody tr", { hasText: "مؤكد" }).first()).toBeVisible();

    // survives a reload (shareable view)
    await page.reload();
    await expect(page.getByLabel("مؤكد", { exact: true })).toBeChecked();

    await page.getByRole("button", { name: "مسح الفلاتر" }).first().click();
    await expect(page).not.toHaveURL(/status=/);
  });

  test("sorts server-side and paginates", async ({ page }) => {
    const header = page.getByRole("columnheader", { name: /الإجمالي/ });
    await header.getByRole("button").click();
    await expect(page).toHaveURL(/sort=totalCents%3Adesc/);
    await expect(header).toHaveAttribute("aria-sort", "descending");

    const totals = async () =>
      (await page.locator("tbody tr td:last-child").allTextContents()).map(parseMoney);
    await expect
      .poll(async () => {
        const t = await totals();
        return t.length > 3 && t.every((v, i) => i === 0 || t[i - 1] >= v);
      })
      .toBe(true);

    const firstPageFirst = await page.locator("tbody tr").first().textContent();
    await page.getByRole("button", { name: "التالي" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.locator("tbody tr").first()).not.toHaveText(firstPageFirst!);

    await page.getByLabel("الصفوف").selectOption("100");
    await expect(page).toHaveURL(/pageSize=100/);
    await expect(page).not.toHaveURL(/page=2/); // changing filters/size returns to page 1
    await expect(page.locator("tbody tr")).toHaveCount(100);
  });

  test("searches by order number and shows an empty state with a way out", async ({ page }) => {
    await openFilters(page);
    await page.getByLabel(/بحث/).fill("zzz-nobody");
    await expect(page.getByText("مفيش أوردرات مطابقة")).toBeVisible();
    await page.getByRole("button", { name: "مسح الفلاتر" }).last().click();
    await waitForOrderRows(page);
  });

  test("hides columns and remembers the choice", async ({ page }) => {
    await page.getByText("الأعمدة", { exact: true }).click();
    await page.getByLabel("الأصناف", { exact: true }).click();
    await expect(page.getByRole("columnheader", { name: "الأصناف" })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("columnheader", { name: "الأصناف" })).toHaveCount(0);
  });

  test("viewers get no bulk-edit controls", async ({ page }) => {
    await expect(page.getByLabel("تحديد كل أوردرات الصفحة")).toHaveCount(0);
  });

  test("exports the filtered orders as CSV", async ({ page }) => {
    await page.goto("/ar/admin/orders?status=CANCELLED&from=2026-06-01&to=2026-06-30");
    await waitForOrderRows(page);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: /تصدير CSV/ }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^orders-\d{4}-\d{2}-\d{2}\.csv$/);
    const text = await (
      await import("node:fs/promises")
    ).readFile((await download.path())!, "utf8");
    const lines = text.trim().split("\r\n");
    expect(lines[0]).toContain("Order #");
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.slice(1).every((l) => l.includes("CANCELLED") && l.includes("2026-06-"))).toBe(
      true,
    );
  });
});

test.describe("admin actions", () => {
  test("admins can select orders for bulk actions", async ({ page }) => {
    await login(page, ACCOUNTS.admin, "/admin/orders");
    await waitForOrderRows(page);
    await page.getByLabel("تحديد كل أوردرات الصفحة").click();
    await expect(page.getByRole("group", { name: "إجراءات جماعية" })).toContainText(/(25|٢٥) محدد/);
    await page.getByRole("button", { name: "إلغاء التحديد" }).click();
    await expect(page.getByRole("group", { name: "إجراءات جماعية" })).toHaveCount(0);
  });

  test("product form validates variants per field", async ({ page }) => {
    await login(page, ACCOUNTS.admin, "/admin/products/new");
    await page.waitForLoadState("networkidle"); // let the form hydrate before typing
    await page.getByRole("tab", { name: "English" }).click();
    await page.locator("#name-en").fill("E2E Roast");
    await page.locator("#name-en").blur();
    await expect(page.getByLabel("الرابط (slug)")).toHaveValue("e2e-roast"); // suggested from the name

    await page.getByRole("button", { name: "+ إضافة نوع" }).click();
    expect(await page.getByLabel("SKU").count()).toBe(2);
    await page.getByRole("button", { name: "إنشاء المنتج" }).click();
    await expect(
      page
        .locator('[role="tabpanel"]:visible')
        .getByText("Enter a description")
        .or(page.locator('[role="tabpanel"]:visible').getByText("اكتب وصفًا"))
        .first(),
    ).toBeVisible();
    await expect(page.getByText(/اسم النوع مطلوب|Variant name is required/).first()).toBeVisible();
    await page.getByLabel("حذف النوع 2").click();
    expect(await page.getByLabel("SKU").count()).toBe(1);
  });
});

test.describe("analytics", () => {
  test("renders every chart and drills down into the orders table", async ({ page }) => {
    await login(page, ACCOUNTS.viewer, "/admin/analytics?from=2026-04-01&to=2026-09-30");
    for (const name of [
      "المبيعات عبر الزمن",
      "المبيعات حسب التصنيف",
      "توزيع حالات الأوردرات أسبوعيًا",
    ]) {
      await expect(page.getByRole("region", { name })).toBeVisible();
    }
    await expect(page.locator("svg.recharts-surface").first()).toBeVisible();
    await expect(page.locator(".recharts-bar-rectangle").first()).toBeVisible();

    // keyboard-accessible drill-down through the table view
    const cat = page.getByRole("region", { name: "المبيعات حسب التصنيف" });
    await cat.getByText("عرض كجدول").click();
    await cat.getByRole("link", { name: "أدوات التحضير" }).click();
    await expect(page).toHaveURL(/\/admin\/orders\?.*category=brewing-gear/);
    await expect(page).toHaveURL(/from=2026-04-01/);
    await expect(page.getByRole("button", { name: /التصنيف: brewing-gear/ })).toBeVisible();
    await waitForOrderRows(page);
  });

  test("clicking a bar drills down too", async ({ page }) => {
    await login(page, ACCOUNTS.viewer, "/admin/analytics?from=2026-04-01&to=2026-09-30");
    await page.locator(".recharts-bar-rectangle").first().waitFor();
    const bar = page
      .getByRole("region", { name: "المبيعات حسب التصنيف" })
      .locator(".recharts-bar-rectangle path")
      .first();
    await bar.click();
    await expect(page).toHaveURL(/\/admin\/orders\?.*category=/);
  });

  test("offers PDF and CSV exports that follow the selected period", async ({ page }) => {
    await login(page, ACCOUNTS.viewer, "/admin/analytics?from=2026-04-01&to=2026-06-30");
    const pdfLink = page.getByRole("link", { name: /تقرير PDF/ });
    await expect(pdfLink).toHaveAttribute("href", /export\/report\?.*from=2026-04-01/);
    await expect(page.getByRole("link", { name: /CSV أوردرات الفترة/ })).toHaveAttribute(
      "href",
      /export\/orders\?.*from=2026-04-01.*to=2026-06-30/,
    );

    // Headless Chrome answers 204 to any `attachment; *.pdf` response (its PDF viewer extension is
    // disabled), so the file itself is checked over HTTP with the page's session instead.
    const res = await page.request.get((await pdfLink.getAttribute("href"))!);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/pdf");
    expect(res.headers()["content-disposition"]).toMatch(/sales-report-2026-04-01\.pdf/);
    expect((await res.body()).subarray(0, 5).toString()).toBe("%PDF-");
  });
});

test.describe("mobile @mobile", () => {
  test("the sidebar becomes a drawer that closes on Escape", async ({ page }) => {
    await login(page, ACCOUNTS.viewer, "/admin");
    await expect(page.getByRole("navigation", { name: "قائمة لوحة التحكم" })).toBeHidden();
    await page.getByRole("button", { name: "فتح القائمة" }).click();
    const nav = page.getByRole("navigation", { name: "قائمة لوحة التحكم" });
    await expect(nav).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(nav).toBeHidden();

    await page.getByRole("button", { name: "فتح القائمة" }).click();
    await nav.getByRole("link", { name: "الأوردرات" }).click();
    await expect(page).toHaveURL(/\/admin\/orders/);
    await expect(nav).toBeHidden(); // closes after navigating
  });

  test("the orders table fits the screen without horizontal page scroll", async ({ page }) => {
    await login(page, ACCOUNTS.viewer, "/admin/orders");
    await waitForOrderRows(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
