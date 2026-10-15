import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/api";
import { asLocalized } from "@/lib/i18n/localized";

/** Fresh price/stock for cart lines: GET /api/variants?ids=a,b,c (names in both languages). */
export async function GET(req: Request) {
  try {
    const ids = (new URL(req.url).searchParams.get("ids") ?? "")
      .split(",")
      .filter(Boolean)
      .slice(0, 50);
    const variants = await db.productVariant.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        priceCents: true,
        stock: true,
        isArchived: true,
        product: { select: { name: true, slug: true, images: true, isActive: true } },
      },
    });
    return NextResponse.json(
      variants.map((v) => ({
        id: v.id,
        variantName: asLocalized(v.name),
        priceCents: v.priceCents,
        stock: v.stock,
        productName: asLocalized(v.product.name),
        slug: v.product.slug,
        image: v.product.images[0] ?? null,
        isActive: v.product.isActive && !v.isArchived,
      })),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
