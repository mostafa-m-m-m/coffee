import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/*
 * Design-system rules (docs/design-system.md). They read the class names written in the code:
 *  - directions are logical (ms-, me-, ps-, pe-, text-start, start-, end-), never left/right, so
 *    the layout mirrors in Arabic by itself;
 *  - colors come from the tokens (bg-accent, text-muted, border-border...), never from the Tailwind
 *    palette (bg-red-500) or a hex value;
 *  - spacing comes from the scale, not from one-off values like p-[13px].
 * Chart libraries and style objects take CSS variables (`var(--accent)`), which is allowed.
 */
const CLASS_RULES = [
  {
    re: /(?<![\w-])-?(?:m|p)[lr]-(?:\d|\[|px|auto)/,
    message: "Use logical spacing (ms-, me-, ps-, pe-) instead of ml-, mr-, pl-, pr-.",
  },
  {
    re: /(?<![\w-])-?(?:left|right)-(?:\d|\[|px|full|auto|1\/2)/,
    message: "Use start-/end- instead of left-/right- so the layout mirrors in RTL.",
  },
  {
    re: /(?<![\w-])text-(?:left|right)(?![\w-])/,
    message: "Use text-start / text-end instead of text-left / text-right.",
  },
  {
    re: /(?<![\w-])(?:border|rounded)-(?:l|r|tl|tr|bl|br)(?![a-z])/,
    message:
      "Use border-s/border-e and rounded-s/rounded-e (logical) instead of l/r corners and sides.",
  },
  {
    re: /(?<![\w-])(?:bg|text|border|ring|fill|stroke|from|to|via|outline|divide|decoration|accent|caret|shadow)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}/,
    message:
      "Use a color token (accent, muted, success, warning, danger, info, border, surface...) instead of a Tailwind palette color.",
  },
  {
    re: /(?<![\w-])(?:bg|text|border|ring|fill|stroke)-\[(?:#|rgb|hsl|oklch)/,
    message: "Do not write a color value in a class: add a token in src/lib/brand.ts.",
  },
  {
    re: /(?<![\w-])(?:p|px|py|pt|pb|ps|pe|m|mx|my|mt|mb|ms|me|gap|gap-x|gap-y|space-x|space-y)-\[[\d.]+(?:px|rem|em)\]/,
    message: "Use the spacing scale (p-3, gap-4...) instead of a one-off value.",
  },
];

const designSystem = {
  rules: {
    classes: {
      meta: { type: "problem", schema: [] },
      create(context) {
        const check = (node, text) => {
          if (typeof text !== "string" || text.length < 4) return;
          for (const { re, message } of CLASS_RULES) {
            if (re.test(text)) context.report({ node, message });
          }
        };
        return {
          Literal: (node) => check(node, node.value),
          TemplateElement: (node) => check(node, node.value.raw),
        };
      },
    },
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/generated/**", "src/lib/brand.ts", "src/**/*.stories.tsx"],
    plugins: { ds: designSystem },
    rules: { "ds/classes": "error" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "storybook-static/**",
  ]),
]);

export default eslintConfig;
