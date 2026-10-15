import { z } from "zod";
import { checkoutSchema } from "@/lib/validations/checkout";
import { subscribeSchema } from "@/lib/validations/subscribe";
import { trackSchema } from "@/lib/validations/track";
import { orderStatusUpdateSchema } from "@/lib/validations/admin-orders";
import { productQuerySchema } from "@/lib/validations/products";
import { addressSchema, profileSchema } from "@/lib/validations/address";
import { shippingQuoteSchema, shippingZoneSchema } from "@/lib/validations/shipping";
import { activityQuerySchema } from "@/lib/services/activity";

/** The request shape of a Zod schema as JSON Schema: the same schema the route validates with. */
const body = (schema: z.ZodType) => ({
  required: true,
  content: {
    "application/json": { schema: z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) },
  },
});

const queryParams = (schema: z.ZodObject) => {
  const json = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as {
    properties?: Record<string, object>;
  };
  return Object.entries(json.properties ?? {}).map(([name, s]) => ({
    name,
    in: "query",
    required: false,
    schema: s,
  }));
};

const error = {
  description: "Error",
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
};
const staff = [{ session: [] as string[] }];
const user = staff; // any signed-in account

/** OpenAPI 3.1 description of the public and dashboard API, built from the validation schemas. */
export function buildOpenApi() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Ember Roastery API",
      version: "1.0.0",
      description:
        "Demo store. Errors are `{ error: { code, params?, fields? } }`; the code is translated by the client.",
    },
    components: {
      securitySchemes: { session: { type: "apiKey", in: "cookie", name: "authjs.session-token" } },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                code: { type: "string" },
                params: { type: "object", additionalProperties: true },
                fields: { type: "object", additionalProperties: { type: "string" } },
              },
              required: ["code"],
            },
          },
        },
      },
    },
    paths: {
      "/api/health": {
        get: {
          summary: "Liveness and database check",
          responses: {
            "200": { description: "ok" },
            "503": { description: "database unreachable" },
          },
        },
      },
      "/api/products": {
        get: {
          summary: "Catalog search and filters",
          parameters: queryParams(productQuerySchema),
          responses: { "200": { description: "Products page" } },
        },
      },
      "/api/products/{slug}": {
        get: {
          summary: "One product with its variants",
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Product" }, "404": error },
        },
      },
      "/api/categories": {
        get: { summary: "Categories", responses: { "200": { description: "Categories" } } },
      },
      "/api/checkout": {
        post: {
          summary: "Place an order (card or cash on delivery)",
          security: [{ session: [] }],
          requestBody: body(checkoutSchema),
          responses: {
            "201": { description: "Order created" },
            "400": error,
            "401": error,
            "409": error,
          },
        },
      },
      "/api/subscribe": {
        post: {
          summary: "Newsletter / waiting-list sign-up",
          requestBody: body(subscribeSchema),
          responses: { "201": { description: "Subscribed" }, "400": error, "429": error },
        },
      },
      "/api/track": {
        post: {
          summary: "Anonymous funnel event",
          requestBody: body(trackSchema),
          responses: { "204": { description: "Recorded" }, "400": error },
        },
      },
      "/api/payments/callback": {
        post: {
          summary: "Payment gateway notice, signed with HMAC-SHA256 in the `x-signature` header",
          responses: { "200": { description: "Applied (idempotent)" }, "401": error },
        },
      },
      "/api/admin/orders/{id}": {
        patch: {
          summary: "Change an order's status (admin)",
          security: staff,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: body(orderStatusUpdateSchema),
          responses: { "200": { description: "Updated" }, "403": error, "409": error },
        },
      },
      "/api/cron/expire-payments": {
        get: {
          summary: "Cancel card orders whose payment window ended (Bearer CRON_SECRET)",
          responses: { "200": { description: "ok" }, "401": error },
        },
      },
      "/api/cron/simulate-day": {
        get: {
          summary: "Add a day of demo activity (Bearer CRON_SECRET)",
          responses: { "200": { description: "ok" }, "401": error },
        },
      },
      "/api/cron/reset-demo": {
        get: {
          summary:
            "Restore the seeded catalog and shipping zones (Bearer CRON_SECRET; POST also works)",
          responses: { "200": { description: "ok" }, "401": error },
        },
      },
      "/api/shipping/quote": {
        get: {
          summary: "Fee and delivery time for a governorate",
          parameters: queryParams(shippingQuoteSchema),
          responses: { "200": { description: "Quote" }, "400": error },
        },
      },
      "/api/auth/demo-login": {
        post: {
          summary: "One-click sign-in to the demo customer or the read-only viewer",
          requestBody: body(
            z.object({
              as: z.enum(["customer", "viewer"]),
              locale: z.enum(["ar", "en"]).optional(),
            }),
          ),
          responses: {
            "200": { description: "Signed in; the session cookie is set" },
            "400": error,
          },
        },
      },
      "/api/me": {
        get: {
          summary: "The signed-in account",
          security: user,
          responses: { "200": { description: "Profile" }, "401": error },
        },
        patch: {
          summary: "Edit own name and mobile number",
          security: user,
          requestBody: body(profileSchema),
          responses: { "200": { description: "Updated" }, "400": error, "401": error },
        },
      },
      "/api/me/addresses": {
        get: {
          summary: "Saved addresses",
          security: user,
          responses: { "200": { description: "Addresses" }, "401": error },
        },
        post: {
          summary: "Add an address",
          security: user,
          requestBody: body(addressSchema),
          responses: { "201": { description: "Created" }, "400": error, "401": error },
        },
      },
      "/api/me/addresses/{id}": {
        patch: {
          summary: "Edit an address or make it the default (someone else's is a 404)",
          security: user,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: body(addressSchema.extend({ isDefault: z.boolean().optional() })),
          responses: { "200": { description: "Updated" }, "404": error },
        },
        delete: {
          summary: "Delete an address",
          security: user,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "204": { description: "Deleted" }, "404": error },
        },
      },
      "/api/orders/me": {
        get: {
          summary: "The signed-in customer's orders",
          security: user,
          responses: { "200": { description: "Orders" }, "401": error },
        },
      },
      "/api/orders/{id}": {
        get: {
          summary: "One own order with its timeline (someone else's is a 404)",
          security: user,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Order" }, "404": error },
        },
      },
      "/api/orders/{id}/invoice": {
        get: {
          summary: "PDF invoice (owner or staff; real orders only)",
          security: user,
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
            {
              name: "lang",
              in: "query",
              required: false,
              schema: { type: "string", enum: ["ar", "en"] },
            },
          ],
          responses: { "200": { description: "application/pdf" }, "404": error },
        },
      },
      "/api/payments/sessions/{ref}": {
        get: {
          summary: "Amount, order number and seconds left of a payment session (owner only)",
          security: user,
          parameters: [{ name: "ref", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Session" }, "404": error },
        },
      },
      "/api/newsletter": {
        post: {
          summary: "Newsletter sign-up",
          requestBody: body(z.object({ email: z.string(), locale: z.enum(["ar", "en"]) })),
          responses: { "201": { description: "Subscribed" }, "400": error, "429": error },
        },
      },
      "/api/subscriptions/interest": {
        post: {
          summary: "Tell me when subscriptions launch",
          requestBody: body(z.object({ email: z.string(), locale: z.enum(["ar", "en"]) })),
          responses: { "201": { description: "Recorded" }, "400": error },
        },
      },
      "/api/back-in-stock": {
        post: {
          summary: "Tell me when this variant is back",
          requestBody: body(
            z.object({ email: z.string(), locale: z.enum(["ar", "en"]), variantId: z.string() }),
          ),
          responses: { "201": { description: "Recorded" }, "400": error, "404": error },
        },
      },
      "/api/admin/activity": {
        get: {
          summary: "Activity feed from orders, stock, products and shipping",
          security: staff,
          parameters: queryParams(activityQuerySchema),
          responses: { "200": { description: "Feed" }, "401": error, "403": error },
        },
      },
      "/api/admin/shipping-zones": {
        get: {
          summary: "Shipping zones",
          security: staff,
          responses: { "200": { description: "Zones" }, "401": error },
        },
      },
      "/api/admin/shipping-zones/{id}": {
        patch: {
          summary: "Edit a zone's fee, days and governorates (admin)",
          security: staff,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: body(shippingZoneSchema),
          responses: {
            "200": { description: "Updated" },
            "400": error,
            "403": error,
            "404": error,
          },
        },
      },
      "/api/admin/uploads/sign": {
        post: {
          summary: "Signed parameters for a direct image upload to Cloudinary (admin)",
          security: staff,
          responses: { "200": { description: "Signature" }, "403": error, "503": error },
        },
      },
      "/api/admin/customers/{id}": {
        get: {
          summary: "One customer with addresses, spend and recent orders",
          security: staff,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Customer" }, "404": error },
        },
      },
      "/api/admin/emails": {
        get: {
          summary: "The e-mail log",
          security: staff,
          responses: { "200": { description: "Emails" }, "401": error },
        },
      },
      "/api/admin/orders/{id}/events": {
        get: {
          summary: "An order's timeline",
          security: staff,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Events" }, "404": error },
        },
      },
    },
  };
}
