import { NextResponse } from "next/server";
import { errorResponse, parseJson, requireRole } from "@/lib/api";
import { revalidateStore } from "@/lib/revalidate";
import { updateZone } from "@/lib/services/shipping";
import { shippingZoneSchema } from "@/lib/validations/shipping";

/** PATCH /api/admin/shipping-zones/:id — change a zone's fee, delivery days and governorates. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/shipping-zones/[id]">) {
  try {
    const user = await requireRole("ADMIN");
    const { id } = await ctx.params;
    const zone = await updateZone(id, await parseJson(req, shippingZoneSchema), user.id);
    revalidateStore(); // the landing's "delivered in 2-5 days" line reads the zones
    return NextResponse.json(zone);
  } catch (e) {
    return errorResponse(e);
  }
}
