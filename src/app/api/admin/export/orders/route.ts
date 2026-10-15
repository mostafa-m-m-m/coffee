import { errorResponse, requireRole } from "@/lib/api";
import { ordersCsvStream } from "@/lib/services/export";
import { orderFiltersSchema } from "@/lib/validations/admin-orders";

/** CSV of the orders matching the same filters the table uses (page/sort are ignored: all matches). */
export async function GET(req: Request) {
  try {
    await requireRole("ADMIN", "VIEWER");
    const filters = orderFiltersSchema.parse(Object.fromEntries(new URL(req.url).searchParams));
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(ordersCsvStream(filters), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="orders-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
