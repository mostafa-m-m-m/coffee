import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api";
import { handleGatewayCallback } from "@/lib/payments";
import { revalidateStore } from "@/lib/revalidate";

/**
 * Payment result from the gateway, signed with HMAC-SHA256 in the `x-signature` header over the
 * raw body. A real gateway posts here with the same shape; without a valid signature the answer
 * is 401 and nothing changes.
 */
export async function POST(req: Request) {
  try {
    const raw = await req.text(); // the signature covers the exact bytes
    const res = await handleGatewayCallback(raw, req.headers.get("x-signature"));
    if (!res.ok) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
    if (res.result.outcome === "paid") revalidateStore(); // stock was taken
    return NextResponse.json({ outcome: res.result.outcome });
  } catch (e) {
    return errorResponse(e);
  }
}
