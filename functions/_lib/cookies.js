export const parseCookies = (header) => {
  const out = {};
  if (!header) {
    return out;
  }
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (name) {
      out[name] = decodeURIComponent(value);
    }
  }
  return out;
};

export const serializeCookie = (name, value, opts = {}) => {
  const segments = [`${name}=${encodeURIComponent(value)}`];
  if (opts.maxAge !== undefined) {
    segments.push(`Max-Age=${opts.maxAge}`);
  }
  if (opts.expires) {
    segments.push(`Expires=${opts.expires.toUTCString()}`);
  }
  segments.push(`Path=${opts.path ?? "/"}`);
  if (opts.domain) {
    segments.push(`Domain=${opts.domain}`);
  }
  if (opts.httpOnly !== false) {
    segments.push("HttpOnly");
  }
  if (opts.secure !== false) {
    segments.push("Secure");
  }
  segments.push(`SameSite=${opts.sameSite ?? "Lax"}`);
  return segments.join("; ");
};

export const SESSION_COOKIE = "__wzd_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
export const OAUTH_STATE_COOKIE = "__wzd_oauth_state";
