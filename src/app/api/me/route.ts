import { NextResponse } from "next/server";
import { errorResponse, parseJson, requireUser } from "@/lib/api";
import { getProfile, updateProfile } from "@/lib/services/account";
import { profileSchema } from "@/lib/validations/address";

/** GET /api/me — the signed-in account. */
export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(await getProfile(user.id));
  } catch (e) {
    return errorResponse(e);
  }
}

/** PATCH /api/me { name, phone? } — edit own name and mobile number. */
export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    return NextResponse.json(await updateProfile(user.id, await parseJson(req, profileSchema)));
  } catch (e) {
    return errorResponse(e);
  }
}
