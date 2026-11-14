/** Browser-side API client. Requests go to this origin (/api/*), carrying the session cookie and the CSRF header. */
export class ApiError extends Error {
  constructor(public status: number, message: string, public errors?: Record<string, string>) {
    super(message);
  }
}

function csrfToken() {
  if (typeof document === "undefined") return "";
  return document.cookie.split("; ").find((c) => c.startsWith("XSRF-TOKEN="))?.split("=")[1] ?? "";
}

export async function api<T = unknown>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = options.method ?? (options.body === undefined ? "GET" : "POST");
  if (method !== "GET" && !csrfToken() && typeof window !== "undefined") {
    await fetch("/api/auth/me", { credentials: "same-origin" }).catch(() => {});
  }
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-XSRF-TOKEN": decodeURIComponent(csrfToken()) },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(0, "Could not reach the server. Check your connection and try again.");
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON error page from a proxy */
  }
  if (!res.ok) {
    const d = (data ?? {}) as { message?: string; errors?: Record<string, string> };
    const fallback = res.status === 401 ? "Please sign in to continue." : res.status === 403 ? "You do not have access to this." : "Something went wrong. Please try again.";
    throw new ApiError(res.status, d.message || fallback, d.errors);
  }
  return data as T;
}

api.get = <T = unknown>(path: string) => api<T>(path, { method: "GET" });
api.post = <T = unknown>(path: string, body?: unknown) => api<T>(path, { method: "POST", body });
api.put = <T = unknown>(path: string, body?: unknown) => api<T>(path, { method: "PUT", body });
api.delete = <T = unknown>(path: string, body?: unknown) => api<T>(path, { method: "DELETE", body });

export function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Something went wrong. Please try again.";
}
