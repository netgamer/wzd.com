import { jsonResponse, errorResponse } from "../../_lib/auth.js";

export const onRequestGet = async ({ data }) => {
  if (!data?.user) {
    return errorResponse(401, "unauthorized", "No active session.");
  }
  return jsonResponse({ user: { id: data.user.id, email: data.user.email } });
};
