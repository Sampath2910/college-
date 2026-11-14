import "server-only";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

/**
 * Server-side read of a PUBLIC endpoint, cached for `revalidate` seconds.
 * Returns null when the record does not exist or the backend is unreachable, so pages can render an honest empty state.
 */
export async function publicGet<T>(path: string, revalidate = 60): Promise<T | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/public${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
