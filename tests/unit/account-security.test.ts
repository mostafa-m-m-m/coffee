import { passwordMatches, setPassword } from "@/lib/services/credentials";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api-error";
import { db } from "@/lib/db";
import { sendOrderConfirmed, sendOrderUpdate } from "@/lib/email/emails";
import { requestPasswordReset, resetPassword, verifyEmail } from "@/lib/services/account-security";
import { consumeToken, createToken } from "@/lib/services/auth-tokens";
import { createOrder } from "@/lib/services/orders";
import { address, makeProduct, makeUser, makeZone, resetDb } from "./fixtures";

beforeEach(resetDb);
afterAll(() => db.$disconnect());

/** The raw token is only ever in the emailed link, so tests read it from the recorded email. */
async function tokenFromLatestEmail(type: string) {
  const mail = await db.emailLog.findFirstOrThrow({
    where: { type },
    orderBy: { createdAt: "desc" },
  });
  return /token=([0-9a-f]{64})/.exec(mail.html)![1];
}

describe("one-time tokens", () => {
  it("work once, and only for their own kind", async () => {
    const user = await makeUser("a@example.com");
    const raw = await createToken(user.id, "reset", 1);
    expect(await consumeToken(raw, "verify")).toBeNull();
    expect(await consumeToken(raw, "reset")).toBe(user.id);
    expect(await consumeToken(raw, "reset")).toBeNull();
  });

  it("expire, and a new request cancels the previous link", async () => {
    const user = await makeUser("a@example.com");
    const expired = await createToken(user.id, "reset", -1);
    expect(await consumeToken(expired, "reset")).toBeNull();

    const first = await createToken(user.id, "reset", 1);
    const second = await createToken(user.id, "reset", 1);
    expect(await consumeToken(first, "reset")).toBeNull();
    expect(await consumeToken(second, "reset")).toBe(user.id);
  });

  it("two simultaneous clicks spend it once", async () => {
    const user = await makeUser("a@example.com");
    const raw = await createToken(user.id, "reset", 1);
    const results = await Promise.all([consumeToken(raw, "reset"), consumeToken(raw, "reset")]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("are stored hashed", async () => {
    const user = await makeUser("a@example.com");
    const raw = await createToken(user.id, "verify", 1);
    expect(await db.authToken.count({ where: { tokenHash: raw } })).toBe(0);
  });
});

describe("password reset", () => {
  it("emails a link in the customer's language and lets them choose a new password", async () => {
    const user = await db.user.create({
      data: { email: "sara@example.com", name: "Sara", locale: "ar" },
    });
    await setPassword(user.id, "OldPassword1", db, 4);
    // somebody is signed in with the old password: the reset must end that session
    await db.session.create({
      data: { token: "old-session", userId: user.id, expiresAt: new Date(Date.now() + 86_400_000) },
    });
    await requestPasswordReset("Sara@Example.com");

    const mail = await db.emailLog.findFirstOrThrow({ where: { type: "reset" } });
    expect(mail.to).toBe("sara@example.com");
    expect(mail.status).toBe("logged_only"); // no mail service in tests
    expect(mail.html).toContain('dir="rtl"');
    expect(mail.html).toContain("/ar/reset-password?token=");

    await resetPassword(await tokenFromLatestEmail("reset"), "NewPassword9");
    const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await passwordMatches(user.id, "NewPassword9")).toBe(true);
    expect(await passwordMatches(user.id, "OldPassword1")).toBe(false);
    expect(after.emailVerified).toBe(true);
    expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
  });

  it("says nothing about unknown addresses: no email, no error", async () => {
    await requestPasswordReset("nobody@example.com");
    expect(await db.emailLog.count()).toBe(0);
  });

  it("rejects a used or made-up link", async () => {
    const sara = await db.user.create({ data: { email: "sara@example.com", name: "Sara" } });
    await setPassword(sara.id, "OldPassword1", db, 4);
    await requestPasswordReset("sara@example.com");
    const token = await tokenFromLatestEmail("reset");
    await resetPassword(token, "NewPassword9");
    await expect(resetPassword(token, "Another1234")).rejects.toMatchObject({
      code: "INVALID_TOKEN",
    });
    await expect(resetPassword("nope", "Another1234")).rejects.toBeInstanceOf(ApiError);
  });
});

describe("email confirmation", () => {
  it("marks the address as verified", async () => {
    const user = await makeUser("a@example.com");
    const raw = await createToken(user.id, "verify", 24);
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).emailVerified).toBe(false);
    await verifyEmail(raw);
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).emailVerified).toBe(true);
  });
});

describe("order emails", () => {
  async function codOrder(locale: "ar" | "en") {
    await makeZone();
    const user = await db.user.create({
      data: { email: `${locale}@example.com`, name: "Buyer", locale },
    });
    const product = await makeProduct({
      slug: "beans",
      variants: [{ sku: "B-1", priceCents: 25_000, stock: 5 }],
    });
    return createOrder({
      userId: user.id,
      lines: [{ variantId: product.variants[0].id, quantity: 2 }],
      address,
      paymentMethod: "COD",
      locale,
    });
  }

  it("the confirmation lists the items and what to pay, in the order's language", async () => {
    const order = await codOrder("en");
    expect(await sendOrderConfirmed(order.id)).toBe("logged_only");
    const mail = await db.emailLog.findFirstOrThrow({ where: { orderId: order.id } });
    expect(mail.type).toBe("order_confirmed");
    expect(mail.html).toContain('lang="en"');
    expect(mail.html).toContain(`#${order.orderNumber}`);
    expect(mail.html).toContain("Pay the courier");
    expect(mail.html).toContain("EGP");
  });

  it("the Arabic version is right-to-left with Arabic text", async () => {
    const order = await codOrder("ar");
    await sendOrderConfirmed(order.id);
    const mail = await db.emailLog.findFirstOrThrow({ where: { orderId: order.id } });
    expect(mail.html).toContain('dir="rtl"');
    expect(mail.html).toContain("ادفع للمندوب");
  });

  it("shipped and apology emails are recorded against the order", async () => {
    const order = await codOrder("en");
    await sendOrderUpdate(order.id, "shipped");
    await sendOrderUpdate(order.id, "apology");
    const types = (await db.emailLog.findMany({ where: { orderId: order.id } }))
      .map((m) => m.type)
      .sort();
    expect(types).toEqual(["apology", "shipped"]);
  });
});
