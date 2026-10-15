import { NextResponse } from "next/server";
import { errorResponse, requireRole } from "@/lib/api";
import { signUpload } from "@/lib/services/uploads";

/** POST /api/admin/uploads/sign — signed parameters for one direct image upload to Cloudinary. */
export async function POST() {
  try {
    await requireRole("ADMIN");
    return NextResponse.json(signUpload(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}
