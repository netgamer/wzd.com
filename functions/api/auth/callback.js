import {
  parseCookies,
  serializeCookie,
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE
} from "../../_lib/cookies.js";
import { signJWT } from "../../_lib/jwt.js";
import { errorResponse } from "../../_lib/auth.js";
import { newId, nowIso } from "../../_lib/db.js";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

const decodeIdToken = (idToken) => {
  const parts = idToken.split(".");
  if (parts.length !== 3) {
    throw new Error("malformed id_token");
  }
  const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const json = atob(padded + pad);
  return JSON.parse(json);
};

const upsertUser = async (db, claims) => {
  const userId = `google-${claims.sub}`;
  const email = claims.email;
  const displayName = claims.name || "";
  const avatarUrl = claims.picture || null;
  const now = nowIso();

  await db
    .prepare(
      `INSERT INTO users (id, email, display_name, avatar_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         email = excluded.email,
         display_name = excluded.display_name,
         avatar_url = excluded.avatar_url,
         updated_at = excluded.updated_at`
    )
    .bind(userId, email, displayName, avatarUrl, now, now)
    .run();

  await db
    .prepare(
      `INSERT INTO user_profiles (user_id, email, display_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         email = excluded.email,
         display_name = excluded.display_name,
         updated_at = excluded.updated_at`
    )
    .bind(userId, email, displayName, now, now)
    .run();

  return userId;
};

export const onRequestGet = async ({ request, env }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state") || "";

  if (!code) {
    return errorResponse(400, "missing_code", "OAuth code missing.");
  }

  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  const redirectUri = env.OAUTH_REDIRECT_URL;
  const jwtSecret = env.JWT_SECRET;
  if (!clientId || !clientSecret || !redirectUri || !jwtSecret) {
    return errorResponse(500, "oauth_not_configured", "Server OAuth env missing.");
  }

  const cookies = parseCookies(request.headers.get("cookie"));
  const expectedState = cookies[OAUTH_STATE_COOKIE];
  const [stateNonce, encodedNext] = stateParam.split(":", 2);
  if (!expectedState || stateNonce !== expectedState) {
    return errorResponse(400, "state_mismatch", "OAuth state mismatch.");
  }
  const next = encodedNext ? decodeURIComponent(encodedNext) : "/";

  let tokenJson;
  try {
    const tokenResponse = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });
    if (!tokenResponse.ok) {
      return errorResponse(
        502,
        "token_exchange_failed",
        `Google token exchange failed (${tokenResponse.status}).`
      );
    }
    tokenJson = await tokenResponse.json();
  } catch (error) {
    console.error("token exchange threw", error);
    return errorResponse(502, "token_exchange_failed", "Google token exchange failed.");
  }

  let claims;
  try {
    claims = decodeIdToken(tokenJson.id_token);
  } catch {
    return errorResponse(400, "bad_id_token", "Failed to parse id_token.");
  }

  if (!claims?.sub || !claims?.email) {
    return errorResponse(400, "bad_id_token", "id_token missing sub/email.");
  }
  if (claims.aud && claims.aud !== clientId) {
    return errorResponse(400, "bad_audience", "id_token audience mismatch.");
  }

  let userId;
  try {
    userId = await upsertUser(env.DB, claims);
  } catch (error) {
    console.error("user upsert failed", error);
    return errorResponse(500, "user_upsert_failed", "Failed to persist user.");
  }

  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const sessionToken = await signJWT(
    { sub: userId, email: claims.email, exp, jti: newId() },
    jwtSecret
  );

  const headers = new Headers({ Location: next || "/" });
  headers.append(
    "Set-Cookie",
    serializeCookie(SESSION_COOKIE, sessionToken, {
      maxAge: SESSION_MAX_AGE,
      sameSite: "Lax"
    })
  );
  headers.append(
    "Set-Cookie",
    serializeCookie(OAUTH_STATE_COOKIE, "", { maxAge: 0, sameSite: "Lax" })
  );

  return new Response(null, { status: 302, headers });
};
