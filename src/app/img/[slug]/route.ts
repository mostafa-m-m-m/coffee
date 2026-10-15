// Generated product artwork in the brand's own language (see public/logo-mark-dark.svg): the
// cream bean with its ember crease on a roast-brown ground. No text is baked in: the product name
// is real, translated page content next to the image. Keeps the demo self-contained (no third-party image hosts) and always on-brand.
import { brand } from "@/lib/brand";

const { grounds: GROUNDS, logo } = brand;

export async function GET(_req: Request, ctx: RouteContext<"/img/[slug]">) {
  const { slug } = await ctx.params;
  const hash = [...slug].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const bg = GROUNDS[hash % GROUNDS.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
  <defs>
    <radialGradient id="ember" cx="50%" cy="38%" r="55%">
      <stop offset="0" stop-color="${logo.ember}" stop-opacity="0.38"/>
      <stop offset="1" stop-color="${logo.ember}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="800" height="800" fill="${bg}"/>
  <rect width="800" height="800" fill="url(#ember)"/>
  <g transform="translate(400 400) rotate(28) scale(1.25)">
    <ellipse rx="130" ry="215" fill="${logo.crema}"/>
    <path d="M0 -175 C65 -85 -65 85 0 175" fill="none" stroke="${logo.ember}" stroke-width="32" stroke-linecap="round"/>
    <path d="M0 -123 C46 -58 -46 58 0 123" fill="none" stroke="${logo.glow}" stroke-width="11" stroke-linecap="round"/>
  </g>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
