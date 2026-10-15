import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, errorResponse, requireRole } from "@/lib/api";

const lines = z.object({
  items: z
    .array(z.object({ variantId: z.string(), quantity: z.number().int().min(1).max(99) }))
    .max(100),
});

const READ = async (userId: string) => {
  const cart = await db.cart.findUnique({
    where: { userId },
    select: { items: { select: { variantId: true, quantity: true } } },
  });
  return cart?.items ?? [];
};

export async function GET() {
  try {
    const user = await requireRole("CUSTOMER", "ADMIN", "VIEWER");
    return NextResponse.json({ items: await READ(user.id) });
  } catch (e) {
    return errorResponse(e);
  }
}

/** Replaces the user's cart. The client merges guest + account carts before calling this. */
export async function PUT(req: Request) {
  try {
    const user = await requireRole("CUSTOMER", "ADMIN", "VIEWER");
    const parsed = lines.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, "VALIDATION");

    const existing = await db.productVariant.findMany({
      where: { id: { in: parsed.data.items.map((i) => i.variantId) }, isArchived: false },
      select: { id: true },
    });
    const valid = new Set(existing.map((v) => v.id));
    const items = parsed.data.items.filter((i) => valid.has(i.variantId));

    await db.$transaction(async (tx) => {
      const cart = await tx.cart.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
        select: { id: true },
      });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cartItem.createMany({ data: items.map((i) => ({ ...i, cartId: cart.id })) });
    });
    return NextResponse.json({ items: await READ(user.id) });
  } catch (e) {
    return errorResponse(e);
  }
}
