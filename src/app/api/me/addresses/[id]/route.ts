import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, parseJson, requireUser } from "@/lib/api";
import { deleteAddress, updateAddress } from "@/lib/services/account";
import { addressSchema } from "@/lib/validations/address";

const updateSchema = addressSchema.extend({ isDefault: z.boolean().optional() });

/** PATCH /api/me/addresses/:id — edit an address, or make it the default. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/me/addresses/[id]">) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    return NextResponse.json(await updateAddress(user.id, id, await parseJson(req, updateSchema)));
  } catch (e) {
    return errorResponse(e);
  }
}

/** DELETE /api/me/addresses/:id */
export async function DELETE(_req: Request, ctx: RouteContext<"/api/me/addresses/[id]">) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    await deleteAddress(user.id, id);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
