import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale } from "@/i18n/config";
import { routing } from "@/i18n/routing";
import { authServer } from "@/lib/auth";

const intl = createIntlMiddleware(routing);

const PROTECTED = /^\/(admin|account|checkout)(\/|$)/;

/** "/en/admin/orders" -> { locale: "en", path: "/admin/orders" } */
function split(pathname: string) {
  const [, first = "", ...rest] = pathname.split("/");
  const locale = isLocale(first) ? first : defaultLocale;
  return { locale, path: "/" + (isLocale(first) ? rest : [first, ...rest]).join("/") };
}

// Layer 1 of 3: route protection (+ locale negotiation). API routes and the UI re-check the role.
// Proxy runs on Node.js in Next 16, so it can read the real session instead of trusting a cookie.
export async function proxy(req: NextRequest) {
  const { locale, path } = split(req.nextUrl.pathname);
  if (PROTECTED.test(path)) {
    const session = await authServer.api.getSession({ headers: req.headers });
    const role = (session?.user as { role?: string } | undefined)?.role;
    const allowed = path.startsWith("/admin") ? role === "ADMIN" || role === "VIEWER" : !!session;
    if (!allowed) {
      const url = new URL(`/${locale}/login`, req.nextUrl);
      url.searchParams.set("callbackUrl", `/${locale}${path}${req.nextUrl.search}`);
      return NextResponse.redirect(url);
    }
  }
  return intl(req);
}

export const config = {
  // everything except API routes, Next internals, generated images and files with an extension
  matcher: ["/((?!api|img|_next|_vercel|.*\\..*).*)"],
};
