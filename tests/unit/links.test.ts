import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * Typed routes for a project that links through next-intl: every internal link written in the
 * source (`href="/products"`, `` href={`/admin/orders/${id}`} ``, `fetch("/api/...")`) must point
 * at a route that exists. A typo in a path fails here instead of becoming a 404 for a customer.
 */

const root = process.cwd();
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const posix = (p: string) => relative(root, p).split(sep).join("/");

// the routes the app really has, from the file system
const appFiles = walk(join(root, "src/app")).map(posix);
/** A route as segments; `[id]` matches anything, `[...rest]` matches the remainder. */
const segments = (route: string) => route.split("/").filter(Boolean);
const WILD = "__X__"; // a `${...}` written in a link: any single segment
function matches(route: string[], link: string[]) {
  for (let i = 0; i < route.length; i++) {
    const r = route[i];
    if (/^\[\.\.\.\w+\]$/.test(r)) return link.length > i;
    if (link[i] === undefined) return false;
    if (/^\[\w+\]$/.test(r) || link[i] === WILD || r === link[i]) continue;
    return false;
  }
  return route.length === link.length;
}

const pages = appFiles
  .filter((f) => /\/page\.tsx$/.test(f) && f.includes("[locale]"))
  .map(
    (f) =>
      f
        .replace(/^src\/app\/\[locale\]/, "")
        .replace(/\/page\.tsx$/, "")
        .replace(/\/\([^/]+\)/g, ""), // route groups do not appear in the URL
  )
  .map((r) => r || "/");
const apis = appFiles
  .filter((f) => /\/route\.ts$/.test(f) && f.startsWith("src/app/api/"))
  .map((f) => f.replace(/^src\/app/, "").replace(/\/route\.ts$/, ""));
const extra = ["/robots.txt", "/sitemap.xml", "/img/x", "/opengraph-image"];
const pagePatterns = [...pages, ...extra].map(segments);
const apiPatterns = apis.map(segments);

// every link written in the source
const sources = walk(join(root, "src"))
  .filter((f) => /\.(ts|tsx)$/.test(f) && !/generated|\.stories\./.test(f))
  .map((f) => ({ file: posix(f), text: readFileSync(f, "utf8") }));

const found: { file: string; path: string; kind: "page" | "api" }[] = [];
for (const { file, text } of sources) {
  const patterns = [
    /href=\{?["'`](\/[^"'`\s{]*(?:\$\{[^}]*\}[^"'`\s{]*)*)["'`]/g,
    /href: ["'`](\/[^"'`]*)["'`]/g,
    /pathname: ["'`](\/[^"'`]*)["'`]/g,
    /fetch\(\s*[`"'](\/api\/[^`"']*)[`"']/g,
    /redirect\(\{ href: ["'`](\/[^"'`]*)["'`]/g,
  ];
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      // `${locale}` prefix is the language segment; a `${x}` after a slash is one segment; one glued to text is a suffix
      const path = m[1]
        .replace(/^\/\$\{[^}]*locale[^}]*\}/, "")
        .replace(/\/\$\{[^}]*\}/g, `/${"__X__"}`)
        .replace(/\$\{[^}]*\}/g, "")
        .split(/[?#]/)[0];
      if (!path || path === "/") {
        found.push({ file, path: "/", kind: "page" });
        continue;
      }
      found.push({ file, path, kind: path.startsWith("/api/") ? "api" : "page" });
    }
  }
}

describe("internal links", () => {
  it("finds the links and the routes it checks them against", () => {
    expect(pages.length).toBeGreaterThan(20);
    expect(apis.length).toBeGreaterThan(40);
    expect(found.length).toBeGreaterThan(100);
  });

  it("every page link points at a page that exists", () => {
    const bad = found
      .filter((l) => l.kind === "page")
      // links to /api, /img and files are checked in the next test or are static assets
      .filter((l) => !/^\/(img|_next)\//.test(l.path) && !/\.[a-z0-9]+$/i.test(l.path))
      .filter((l) => !pagePatterns.some((r) => matches(r, segments(l.path))))
      .map((l) => `${l.file}: ${l.path}`);
    expect([...new Set(bad)]).toEqual([]);
  });

  it("every API call points at a route that exists", () => {
    const bad = found
      .filter((l) => l.kind === "api")
      .filter((l) => !apiPatterns.some((r) => matches(r, segments(l.path))))
      .map((l) => `${l.file}: ${l.path}`);
    expect([...new Set(bad)]).toEqual([]);
  });
});
