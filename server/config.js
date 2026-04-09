const readEnv = (name, fallback = "") => {
  const value = process.env[name];
  return typeof value === "string" ? value : fallback;
};

export const config = {
  port: Number(readEnv("PORT", "8787")),
  allowedOrigin: readEnv("ALLOWED_ORIGIN", "https://wzd.kr"),
  groqApiKey: readEnv("GROQ_API_KEY"),
  groqModel: readEnv("GROQ_MODEL", "openai/gpt-oss-120b"),
  n8nBaseUrl: readEnv("N8N_BASE_URL"),
  n8nApiKey: readEnv("N8N_API_KEY")
};

export const assertConfig = () => {
  if (!config.groqApiKey) {
    throw new Error("GROQ_API_KEY is not configured");
  }
};
