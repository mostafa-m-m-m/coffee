import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, parseJson, requireRole } from "@/lib/api";
import { notify } from "@/lib/email/dispatch";
import { sendOrderUpdate } from "@/lib/email/emails";
import { bulkUpdateOrderStatus } from "@/lib/services/admin-orders";
import { afterStockChange } from "@/lib/stock-change";
import { ORDER_STATUSES } from "@/lib/validations/admin-orders";

const schema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
  status: z.enum(ORDER_STATUSES),
});

export async function POST(req: Request) {
  try {
    const user = await requireRole("ADMIN");
    const { ids, status } = await parseJson(req, schema);
    const result = await bulkUpdateOrderStatus([...new Set(ids)], status, user.id);
    if (result.changed.length) afterStockChange();
    if (status === "SHIPPED") {
      for (const id of result.changed) notify(() => sendOrderUpdate(id, "shipped"));
    }
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
