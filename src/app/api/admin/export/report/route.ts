import { renderToBuffer } from "@react-pdf/renderer";
import { errorResponse, requireRole } from "@/lib/api";
import { pick } from "@/lib/i18n/localized";
import { SalesReport } from "@/lib/pdf/report";
import {
  getSalesByCategory,
  getSummary,
  getTimeseries,
  getTopProducts,
} from "@/lib/services/analytics";
import { rangeFromRequest } from "@/lib/validations/analytics";

export async function GET(req: Request) {
  try {
    await requireRole("ADMIN", "VIEWER");
    const r = rangeFromRequest(req);

    const [{ current, previous }, series, categories, topProducts] = await Promise.all([
      getSummary(r, r.previous),
      getTimeseries(r, r.granularity, r.fromDate, r.toDate),
      getSalesByCategory(r),
      getTopProducts(r, 10),
    ]);

    // the built-in PDF fonts have no Arabic shaping, so the report is in English
    const named = <T extends { name: unknown }>(rows: T[]) =>
      rows.map((row) => ({ ...row, name: pick(row.name, "en") }));

    const pdf = await renderToBuffer(
      SalesReport({
        data: {
          from: r.fromDate,
          to: r.toDate,
          current,
          previous,
          series,
          categories: named(categories),
          topProducts: named(topProducts),
        },
      }),
    );
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="sales-report-${r.fromDate}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
