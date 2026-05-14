import { verifyJWT } from "./jwt.js";
import { parseCookies, SESSION_COOKIE } from "./cookies.js";

export const getUserFromRequest = async (request, env) => {
  const cookies = parseCookies(request.headers.get("cookie"));
  const token = cookies[SESSION_COOKIE];
  if (!token) {
    return null;
  }
  const secret = env.JWT_SECRET;
  if (!secret) {
    return null;
  }
  const payload = await verifyJWT(token, secret);
  if (!payload?.sub || !payload?.email) {
    return null;
  }
  return { id: payload.sub, email: payload.email };
};

export const jsonResponse = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    status: init.status ?? 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers ?? {})
    }
  });

export const errorResponse = (status, code, message) =>
  jsonResponse({ error: { code, message } }, { status });

export const requireAuth = (context) => {
  const user = context.data?.user;
  if (!user) {
    throw new HttpError(401, "unauthorized", "Sign in required.");
  }
  return user;
};

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const wrap = (handler) => async (context) => {
  try {
    return await handler(context);
  } catch (error) {
    if (error instanceof HttpError) {
      return errorResponse(error.status, error.code, error.message);
    }
    console.error("Unhandled API error", error);
    return errorResponse(500, "internal_error", "Unexpected server error.");
  }
};
