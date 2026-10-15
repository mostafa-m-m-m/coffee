import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { subscribe } from "@/lib/services/subscribers";
import { subscribeSchema } from "@/lib/validations/subscribe";
import { resetDb } from "./fixtures";

beforeEach(resetDb);
afterAll(() => db.$disconnect());

describe("subscribe", () => {
  it("stores the email in lower case and once per list, however often it is submitted", async () => {
    await subscribe({ email: "Fan@Example.com", source: "newsletter", locale: "ar" });
    await subscribe({ email: "fan@example.com ", source: "newsletter", locale: "en" });
    expect(await db.subscriber.count()).toBe(1);
    expect((await db.subscriber.findFirstOrThrow()).email).toBe("fan@example.com");
  });

  it("keeps the newsletter and the subscriptions waiting list apart", async () => {
    await subscribe({ email: "fan@example.com", source: "newsletter", locale: "ar" });
    await subscribe({ email: "fan@example.com", source: "subscription-interest", locale: "ar" });
    expect(await db.subscriber.count()).toBe(2);
  });

  it("rejects a bad email, an unknown list and an unknown language", () => {
    expect(
      subscribeSchema.safeParse({ email: "nope", source: "newsletter", locale: "ar" }).success,
    ).toBe(false);
    expect(
      subscribeSchema.safeParse({ email: "a@b.co", source: "spam", locale: "ar" }).success,
    ).toBe(false);
    expect(
      subscribeSchema.safeParse({ email: "a@b.co", source: "newsletter", locale: "fr" }).success,
    ).toBe(false);
  });
});
