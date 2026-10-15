import { errorResponse, requireRole } from "@/lib/api";
import { isLocale } from "@/i18n/config";
import { buildInvoice } from "@/lib/services/invoices";

/**
 * GET /api/orders/:id/invoice[?lang=ar|en] — the PDF invoice, in the order's language unless asked.
 * Customers get their own orders only; staff get any. Orders without a real sale have none (404).
 */
export async function GET(req: Request, ctx: RouteContext<"/api/orders/[id]/invoice">) {
  try {
    const user = await requireRole("CUSTOMER", "ADMIN", "VIEWER");
    const { id } = await ctx.params;
    const lang = new URL(req.url).searchParams.get("lang");
    const { pdf, orderNumber } = await buildInvoice(
      id,
      user.role === "CUSTOMER" ? user.id : null,
      isLocale(lang) ? lang : undefined,
    );
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${orderNumber}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
