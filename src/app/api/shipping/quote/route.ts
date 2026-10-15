import { NextResponse } from "next/server";
import { ApiError, errorResponse } from "@/lib/api";
import { quoteShipping } from "@/lib/services/shipping";
import { shippingQuoteSchema } from "@/lib/validations/shipping";

/** GET /api/shipping/quote?governorate=C[&subtotal=450] — fee and delivery time for a governorate. */
export async function GET(req: Request) {
  try {
    const parsed = shippingQuoteSchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!parsed.success) {
      throw new ApiError(400, "VALIDATION", {
        fields: { governorate: "validation.governorateInvalid" },
      });
    }
    const { governorate, subtotal } = parsed.data;
    return NextResponse.json(
      await quoteShipping(
        governorate,
        subtotal === undefined ? undefined : Math.round(subtotal * 100),
      ),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
