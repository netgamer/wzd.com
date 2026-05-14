import { serializeCookie, SESSION_COOKIE } from "../../_lib/cookies.js";

const clearSessionResponse = () => {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8"
  });
  headers.append(
    "Set-Cookie",
    serializeCookie(SESSION_COOKIE, "", {
      maxAge: 0,
      sameSite: "Lax"
    })
  );
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
};

export const onRequestPost = async () => clearSessionResponse();
// Allow GET for convenience (e.g. <a href="/api/auth/logout">) — same effect.
export const onRequestGet = async () => clearSessionResponse();
