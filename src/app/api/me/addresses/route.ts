import { NextResponse } from "next/server";
import { errorResponse, parseJson, requireUser } from "@/lib/api";
import { addAddress, listAddresses } from "@/lib/services/account";
import { addressSchema } from "@/lib/validations/address";

/** GET /api/me/addresses — saved shipping addresses, default first. */
export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ items: await listAddresses(user.id) });
  } catch (e) {
    return errorResponse(e);
  }
}

/** POST /api/me/addresses — save a new address (the first one becomes the default). */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    return NextResponse.json(await addAddress(user.id, await parseJson(req, addressSchema)), {
      status: 201,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
