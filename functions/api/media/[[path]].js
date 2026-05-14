import { wrap, errorResponse } from "../../_lib/auth.js";

// Proxy /api/media/<key…> → R2 object. We intentionally do not expose the R2
// bucket public URL; everything is fetched through here so we can:
//  - enforce ownership / public_read flag from the `media` table
//  - apply consistent immutable Cache-Control
//  - swap storage backends later without breaking note metadata URLs

const buildKey = (params) => {
  const raw = params?.path;
  if (!raw) return "";
  if (Array.isArray(raw)) return raw.join("/");
  return String(raw);
};

export const onRequestGet = wrap(async ({ env, params, data, request }) => {
  const key = buildKey(params);
  if (!key) {
    return errorResponse(404, "not_found", "Missing media path.");
  }

  const record = await env.DB
    .prepare("SELECT user_id, content_type, public_read FROM media WHERE key = ?")
    .bind(key)
    .first();

  // Allow access if: row says public_read, or the requester is the owner.
  if (record) {
    const requesterId = data?.user?.id;
    if (!record.public_read && requesterId !== record.user_id) {
      return errorResponse(403, "forbidden", "Not allowed.");
    }
  }
  // If no DB row exists (legacy / orphan), still try R2 read-only — this lets
  // SSR shared boards keep working if someone uploaded before the media table
  // existed. Comment out this fall-through to enforce strict tracking.

  const object = await env.R2_MEDIA.get(key);
  if (!object) {
    return errorResponse(404, "not_found", "Media not found.");
  }

  // Conditional request handling — let CDN do its job.
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch === object.httpEtag) {
    return new Response(null, { status: 304 });
  }

  const headers = new Headers();
  headers.set(
    "Content-Type",
    record?.content_type || object.httpMetadata?.contentType || "application/octet-stream"
  );
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  if (object.size !== undefined) {
    headers.set("Content-Length", String(object.size));
  }
  return new Response(object.body, { status: 200, headers });
});

export const onRequestDelete = wrap(async ({ env, params, data }) => {
  const requester = data?.user;
  if (!requester) {
    return errorResponse(401, "unauthorized", "Sign in required.");
  }
  const key = buildKey(params);
  if (!key) {
    return errorResponse(404, "not_found", "Missing media path.");
  }

  const record = await env.DB
    .prepare("SELECT user_id FROM media WHERE key = ?")
    .bind(key)
    .first();
  if (record && record.user_id !== requester.id) {
    return errorResponse(403, "forbidden", "Not allowed.");
  }

  await env.R2_MEDIA.delete(key);
  await env.DB.prepare("DELETE FROM media WHERE key = ?").bind(key).run();
  return new Response(null, { status: 204 });
});
