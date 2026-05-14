export interface ApiError extends Error {
  status: number;
  code?: string;
}

const buildError = (status: number, code: string | undefined, message: string): ApiError => {
  const error = new Error(message) as ApiError;
  error.status = status;
  if (code) error.code = code;
  return error;
};

const unauthorizedListeners = new Set<() => void>();

export const onUnauthorized = (cb: () => void): (() => void) => {
  unauthorizedListeners.add(cb);
  return () => {
    unauthorizedListeners.delete(cb);
  };
};

const notifyUnauthorized = () => {
  for (const cb of unauthorizedListeners) {
    try {
      cb();
    } catch (error) {
      console.error("unauthorized listener threw", error);
    }
  }
};

export interface ApiFetchOptions<TBody = unknown> {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: TBody;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  allowUnauthorized?: boolean;
}

const buildUrl = (path: string, query?: ApiFetchOptions["query"]): string => {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
};

export const apiFetch = async <TResponse = unknown, TBody = unknown>(
  path: string,
  options: ApiFetchOptions<TBody> = {}
): Promise<TResponse> => {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = { Accept: "application/json" };
  let body: BodyInit | undefined;
  if (options.body !== undefined && method !== "GET") {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const response = await fetch(buildUrl(path, options.query), {
    method,
    credentials: "include",
    headers,
    body,
    signal: options.signal
  });

  if (response.status === 401 && !options.allowUnauthorized) {
    notifyUnauthorized();
    throw buildError(401, "unauthorized", "Sign in required.");
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  const contentType = response.headers.get("content-type") || "";
  let payload: any = null;
  if (contentType.includes("application/json")) {
    payload = await response.json().catch(() => null);
  } else if (response.body) {
    payload = await response.text().catch(() => null);
  }

  if (!response.ok) {
    const code = payload?.error?.code;
    const message = payload?.error?.message || `Request failed (${response.status}).`;
    throw buildError(response.status, code, message);
  }

  return payload as TResponse;
};
