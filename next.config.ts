import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const isDev = process.env.NODE_ENV === "development";

/**
 * Content Security Policy. A per-request nonce would force every page to render dynamically and
 * rules out the static shell the store is built on (Cache Components), so scripts and styles keep
 * 'unsafe-inline' for the framework's own inline bootstrap; everything else is locked to this origin.
 * Product images may be https links when no image host is configured.
 */
const csp = (extra: { script?: string; style?: string } = {}) =>
  [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${extra.script ?? ""}`.trim(),
    `style-src 'self' 'unsafe-inline' ${extra.style ?? ""}`.trim(),
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.cloudinary.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

const baseHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // unknown URLs answer 404 with a page that speaks both languages (the root layout is [locale])
  experimental: { globalNotFound: true },
  partialPrefetching: true,
  serverExternalPackages: ["@react-pdf/renderer"],
  // the invoice's fonts are read from disk at run time, so the deployed bundle must carry them
  outputFileTracingIncludes: { "/api/orders/[id]/invoice": ["./assets/fonts/**/*"] },
  async headers() {
    return [
      // the API docs page loads Swagger UI from one CDN, so it gets its own, wider policy
      {
        source: "/api/docs",
        headers: [
          ...baseHeaders,
          {
            key: "Content-Security-Policy",
            value: csp({ script: "https://cdn.jsdelivr.net", style: "https://cdn.jsdelivr.net" }),
          },
        ],
      },
      {
        source: "/((?!api/docs$).*)",
        headers: [...baseHeaders, { key: "Content-Security-Policy", value: csp() }],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
