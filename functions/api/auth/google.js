import { serializeCookie, OAUTH_STATE_COOKIE } from "../../_lib/cookies.js";
import { errorResponse } from "../../_lib/auth.js";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

const randomState = () => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export const onRequestGet = async ({ request, env }) => {
  const clientId = env.GOOGLE_CLIENT_ID;
  const redirectUri = env.OAUTH_REDIRECT_URL;
  if (!clientId || !redirectUri) {
    return errorResponse(500, "oauth_not_configured", "Google OAuth env vars missing.");
  }

  const url = new URL(request.url);
  const next = url.searchParams.get("next") || "/";

  const state = randomState();
  const statePayload = `${state}:${encodeURIComponent(next)}`;

  const authUrl = new URL(GOOGLE_AUTH_URL);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", statePayload);
  authUrl.searchParams.set("access_type", "online");
  authUrl.searchParams.set("prompt", "select_account");

  const headers = new Headers({ Location: authUrl.toString() });
  headers.append(
    "Set-Cookie",
    serializeCookie(OAUTH_STATE_COOKIE, state, {
      maxAge: 600,
      sameSite: "Lax"
    })
  );

  return new Response(null, { status: 302, headers });
};
