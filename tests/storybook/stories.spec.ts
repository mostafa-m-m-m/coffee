import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type Entry = { id: string; title: string; name: string; type: string };
const index = JSON.parse(
  readFileSync(join(process.cwd(), "storybook-static", "index.json"), "utf8"),
) as {
  entries: Record<string, Entry>;
};
const stories = Object.values(index.entries).filter((e) => e.type === "story");

test("the design system has stories for every primitive and pattern", () => {
  const titles = new Set(stories.map((s) => s.title));
  for (const title of [
    "Primitives/Button",
    "Primitives/Field",
    "Primitives/Badge",
    "Primitives/Card",
    "Primitives/Sheet",
    "Primitives/Tabs",
    "Patterns/Overview",
    "Foundations/Tokens",
  ]) {
    expect(titles, title).toContain(title);
  }
});

for (const locale of ["en", "ar"] as const) {
  for (const theme of ["light", "dark"] as const) {
    for (const story of stories) {
      test(`${story.title} · ${story.name} · ${locale} · ${theme}`, async ({ page }) => {
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(
          `/iframe.html?id=${story.id}&viewMode=story&globals=locale:${locale};theme:${theme}`,
        );
        await page.locator("#storybook-root > :not(style)").first().waitFor();
        await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
        if (theme === "dark") await expect(page.locator("html")).toHaveClass(/dark/);

        // Storybook's own accessibility panel runs axe too; wait our turn if it is mid-run
        let violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"];
        for (let attempt = 0; ; attempt++) {
          try {
            ({ violations } = await new AxeBuilder({ page })
              .include("#storybook-root")
              .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
              .analyze());
            break;
          } catch (e) {
            if (attempt >= 4 || !/already running/.test(String(e))) throw e;
            await page.waitForTimeout(500);
          }
        }
        expect(
          violations.map(
            (v) =>
              `${v.id}: ${v.nodes
                .slice(0, 2)
                .map((n) => n.target.join(" "))
                .join(" | ")}`,
          ),
        ).toEqual([]);
        expect(errors).toEqual([]);
      });
    }
  }
}
