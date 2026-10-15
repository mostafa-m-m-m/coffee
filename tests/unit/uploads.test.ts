import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

async function load(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const k of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"])
    delete process.env[k];
  Object.assign(process.env, env);
  return import("@/lib/services/uploads");
}

describe("signed image uploads", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("is off without Cloudinary keys, and says so", async () => {
    const { signUpload, uploadsConfigured } = await load({});
    expect(uploadsConfigured()).toBe(false);
    expect(() => signUpload()).toThrowError(
      expect.objectContaining({ code: "UPLOADS_UNAVAILABLE", status: 503 }),
    );
  });

  it("signs the folder, formats and timestamp with the secret, and never returns the secret", async () => {
    const { signUpload, uploadsConfigured } = await load({
      CLOUDINARY_CLOUD_NAME: "demo",
      CLOUDINARY_API_KEY: "key123",
      CLOUDINARY_API_SECRET: "s3cret",
    });
    expect(uploadsConfigured()).toBe(true);
    const out = signUpload(1_700_000_000_000);
    const expected = createHash("sha1")
      .update("allowed_formats=jpg,png,webp&folder=ember/products&timestamp=1700000000s3cret")
      .digest("hex");
    expect(out).toMatchObject({
      uploadUrl: "https://api.cloudinary.com/v1_1/demo/image/upload",
      apiKey: "key123",
      timestamp: 1_700_000_000,
      signature: expected,
      folder: "ember/products",
    });
    expect(JSON.stringify(out)).not.toContain("s3cret");
  });
});
