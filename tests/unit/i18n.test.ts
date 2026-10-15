import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { IntlMessageFormat } from "intl-messageformat";
import { locales } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { ERROR_CODES } from "@/lib/api-error";
import { ORDER_STATUSES } from "@/lib/validations/admin-orders";

type Tree = { [k: string]: string | Tree };

/** "Store.cart.title" -> "message text" */
function flatten(tree: Tree, prefix = ""): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((out, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return typeof v === "string" ? { ...out, [key]: v } : { ...out, ...flatten(v, key) };
  }, {});
}

const flat = Object.fromEntries(
  locales.map((l) => [l, flatten(messages[l] as unknown as Tree)]),
) as Record<(typeof locales)[number], Record<string, string>>;

describe("message catalogs", () => {
  it("English and Arabic have exactly the same keys", () => {
    const ar = Object.keys(flat.ar).sort();
    const en = Object.keys(flat.en).sort();
    expect(en.filter((k) => !ar.includes(k))).toEqual([]);
    expect(ar.filter((k) => !en.includes(k))).toEqual([]);
  });

  it("has no empty messages", () => {
    for (const l of locales) {
      expect(Object.entries(flat[l]).filter(([, v]) => !v.trim())).toEqual([]);
    }
  });

  it("every message parses as valid ICU, and both locales use the same placeholders", () => {
    const args = (text: string, locale: string) => {
      const ast = new IntlMessageFormat(text, locale).getAst();
      const names = new Set<string>();
      const walk = (nodes: unknown[]) => {
        for (const n of nodes as {
          type: number;
          value?: string;
          options?: Record<string, { value: unknown[] }>;
          children?: unknown[];
        }[]) {
          // 0 literal, 1 argument, 2 number, 3 date, 4 time, 5 select, 6 plural, 8 tag
          if (n.type !== 0 && n.type !== 7 && n.type !== 8 && n.value) names.add(n.value);
          if (n.options) Object.values(n.options).forEach((o) => walk(o.value));
          if (n.children) walk(n.children);
        }
      };
      walk(ast);
      return [...names].sort();
    };
    for (const key of Object.keys(flat.ar)) {
      expect(args(flat.en[key], "en"), key).toEqual(args(flat.ar[key], "ar"));
    }
  });

  it("covers every API error code and order status", () => {
    for (const l of locales) {
      for (const code of ERROR_CODES) expect(flat[l][`Errors.api.${code}`], code).toBeTruthy();
      for (const s of ORDER_STATUSES) expect(flat[l][`Common.status.${s}`], s).toBeTruthy();
    }
  });

  it("every validation key used by a schema exists", () => {
    const used = new Set<string>();
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.tsx?$/.test(f)) {
          for (const m of readFileSync(p, "utf8").matchAll(/"(validation\.[A-Za-z]+)"/g))
            used.add(m[1]);
        }
      }
    };
    walk(join(process.cwd(), "src"));
    expect(used.size).toBeGreaterThan(10);
    for (const l of locales)
      for (const key of used) expect(flat[l][`Errors.${key}`], key).toBeTruthy();
  });
});

describe("source hygiene", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) {
        if (f !== "generated") walk(p);
      } else if (/\.(tsx?|css)$/.test(f)) files.push(p);
    }
  };
  walk(join(process.cwd(), "src"));
  const rel = (p: string) => relative(process.cwd(), p).replaceAll("\\", "/");

  it("keeps Arabic text out of the source (it lives in messages/ only)", () => {
    // the language switcher labels each language in its own language by design
    const allowed = new Set(["src/i18n/config.ts"]);
    const offenders = files
      .filter((f) => !allowed.has(rel(f)) && /[؀-ۿ]/.test(readFileSync(f, "utf8")))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it("defines brand colors in one place only (src/lib/brand.ts)", () => {
    const hex = /#[0-9a-fA-F]{6}\b/;
    const offenders = files
      .filter((f) => rel(f) !== "src/lib/brand.ts" && hex.test(readFileSync(f, "utf8")))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it("carries no showcase/demo-project wording in the source, messages or docs", () => {
    const banned = new RegExp(["port", "folio"].join("") + "|بورتفوليو", "i");
    const docs = ["README.md", "docs/CASE_STUDY.md", "docs/STITCH_PROMPTS.md"].map((f) =>
      join(process.cwd(), f),
    );
    const catalogs = locales.flatMap((l) =>
      readdirSync(join(process.cwd(), "messages", l)).map((n) =>
        join(process.cwd(), "messages", l, n),
      ),
    );
    for (const f of [...files, ...docs, ...catalogs]) {
      expect(banned.test(readFileSync(f, "utf8")), rel(f)).toBe(false);
    }
  });
});
