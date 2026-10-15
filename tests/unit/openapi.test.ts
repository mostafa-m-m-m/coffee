import { describe, expect, it } from "vitest";
import { buildOpenApi } from "@/lib/openapi";

describe("OpenAPI description", () => {
  const spec = buildOpenApi();

  it("is built from the validation schemas without errors", () => {
    expect(spec.openapi).toBe("3.1.0");
    expect(Object.keys(spec.paths)).toContain("/api/checkout");
  });

  it("covers the account, dashboard and job endpoints, each with a method and a response", () => {
    const wanted = [
      "/api/me",
      "/api/me/addresses/{id}",
      "/api/orders/me",
      "/api/payments/sessions/{ref}",
      "/api/shipping/quote",
      "/api/admin/activity",
      "/api/admin/shipping-zones/{id}",
      "/api/admin/uploads/sign",
      "/api/cron/reset-demo",
    ];
    for (const path of wanted) {
      const entry = (spec.paths as Record<string, Record<string, { responses: object }>>)[path];
      expect(entry, path).toBeDefined();
      for (const op of Object.values(entry))
        expect(Object.keys(op.responses).length, path).toBeGreaterThan(0);
    }
  });

  it("describes request bodies and filters from the real Zod schemas", () => {
    const checkout = spec.paths["/api/checkout"].post.requestBody.content["application/json"]
      .schema as {
      properties: Record<string, unknown>;
    };
    expect(Object.keys(checkout.properties)).toContain("paymentMethod");
    const filters = spec.paths["/api/products"].get.parameters.map((p) => p.name);
    expect(filters).toEqual(expect.arrayContaining(["q", "category", "roast", "note", "sort"]));
  });
});
