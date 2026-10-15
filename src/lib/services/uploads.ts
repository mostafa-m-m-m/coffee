import { createHash } from "node:crypto";
import { ApiError } from "@/lib/api-error";
import { env } from "@/lib/env";

export const UPLOAD_FOLDER = "ember/products";
export const UPLOAD_FORMATS = "jpg,png,webp";

export const uploadsConfigured = () => {
  const e = env();
  return !!(e.CLOUDINARY_CLOUD_NAME && e.CLOUDINARY_API_KEY && e.CLOUDINARY_API_SECRET);
};

/**
 * Parameters for one direct browser -> Cloudinary upload. The signature covers the folder, the
 * allowed formats and the timestamp, so a signed request can only put a jpg/png/webp into the
 * product folder and stops being accepted once the timestamp is stale. The API secret never
 * leaves the server. Without Cloudinary keys the dashboard falls back to pasted image URLs.
 */
export function signUpload(now = Date.now()) {
  const {
    CLOUDINARY_CLOUD_NAME: cloudName,
    CLOUDINARY_API_KEY: apiKey,
    CLOUDINARY_API_SECRET: secret,
  } = env();
  if (!cloudName || !apiKey || !secret) throw new ApiError(503, "UPLOADS_UNAVAILABLE");
  const timestamp = Math.floor(now / 1000);
  // Cloudinary signs the params sorted by name: sha1("a=1&b=2" + secret)
  const toSign = `allowed_formats=${UPLOAD_FORMATS}&folder=${UPLOAD_FOLDER}&timestamp=${timestamp}`;
  const signature = createHash("sha1")
    .update(toSign + secret)
    .digest("hex");
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    apiKey,
    timestamp,
    signature,
    folder: UPLOAD_FOLDER,
    allowedFormats: UPLOAD_FORMATS,
  };
}
