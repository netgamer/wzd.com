import { getUserFromRequest } from "./_lib/auth.js";

export const onRequest = async (context) => {
  context.data = context.data ?? {};
  try {
    context.data.user = await getUserFromRequest(context.request, context.env);
  } catch (error) {
    console.error("auth middleware failed", error);
    context.data.user = null;
  }
  return context.next();
};
