import { requireAuth, wrap, jsonResponse, HttpError } from "../_lib/auth.js";
import { nowIso } from "../_lib/db.js";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif"
]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — client should pre-compress.

const extensionFor = (contentType) => {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/avif":
      return "avif";
    default:
      return "bin";
  }
};

const randomKey = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export const onRequestPost = wrap(async ({ env, data, request }) => {
  const user = requireAuth({ data });
  if (!env.R2_MEDIA) {
    throw new HttpError(500, "r2_not_configured", "R2 bucket binding missing.");
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    throw new HttpError(400, "bad_form", "Expected multipart/form-data.");
  }

  const file = form.get("file");
  if (!file || typeof file === "string") {
    throw new HttpError(400, "missing_file", "`file` field is required.");
  }
  const contentType = file.type || "application/octet-stream";
  if (!ALLOWED_TYPES.has(contentType)) {
    throw new HttpError(415, "unsupported_type", `Unsupported file type: ${contentType}`);
  }
  if (file.size > MAX_BYTES) {
    throw new HttpError(413, "too_large", "File exceeds 5 MB limit (compress before upload).");
  }

  const ext = extensionFor(contentType);
  const datePrefix = new Date().toISOString().slice(0, 10);
  const key = `notes/${user.id}/${datePrefix}/${randomKey()}.${ext}`;

  await env.R2_MEDIA.put(key, file.stream(), {
    httpMetadata: {
      contentType,
      cacheControl: "public, max-age=31536000, immutable"
    },
    customMetadata: {
      userId: user.id
    }
  });

  await env.DB
    .prepare(
      `INSERT INTO media (key, user_id, content_type, byte_size, public_read, created_at)
       VALUES (?, ?, ?, ?, 1, ?)`
    )
    .bind(key, user.id, contentType, file.size, nowIso())
    .run();

  return jsonResponse({
    key,
    url: `/api/media/${key}`,
    contentType,
    size: file.size
  });
});
