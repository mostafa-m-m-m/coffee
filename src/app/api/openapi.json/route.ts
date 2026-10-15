import { NextResponse } from "next/server";
import { buildOpenApi } from "@/lib/openapi";

/** GET /api/openapi.json — the API description, built from the same Zod schemas the routes validate with. */
export async function GET() {
  return NextResponse.json(buildOpenApi());
}
