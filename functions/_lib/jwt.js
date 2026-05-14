// HS256 JWT signing / verification using Web Crypto SubtleCrypto.
// No external deps — Cloudflare Workers runtime supplies crypto.subtle.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const base64UrlEncode = (bytes) => {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
};

const base64UrlDecode = (str) => {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const importKey = async (secret) =>
  crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );

export const signJWT = async (payload, secret) => {
  const header = { alg: "HS256", typ: "JWT" };
  const headerEncoded = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadEncoded = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const data = `${headerEncoded}.${payloadEncoded}`;

  const key = await importKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const signatureEncoded = base64UrlEncode(new Uint8Array(signature));

  return `${data}.${signatureEncoded}`;
};

export const verifyJWT = async (token, secret) => {
  if (typeof token !== "string") {
    return null;
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }
  const [headerEncoded, payloadEncoded, signatureEncoded] = parts;
  const data = `${headerEncoded}.${payloadEncoded}`;

  let key;
  try {
    key = await importKey(secret);
  } catch {
    return null;
  }

  let signatureBytes;
  try {
    signatureBytes = base64UrlDecode(signatureEncoded);
  } catch {
    return null;
  }

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    encoder.encode(data)
  );
  if (!valid) {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(decoder.decode(base64UrlDecode(payloadEncoded)));
  } catch {
    return null;
  }

  if (typeof payload?.exp === "number" && payload.exp * 1000 < Date.now()) {
    return null;
  }

  return payload;
};
