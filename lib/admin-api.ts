export class AdminApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { credentials: "same-origin", cache: "no-store", ...options });
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new AdminApiError("Admin API is not available. Deploy Pages Functions and configure D1 first.", response.status || 503);
  }
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new AdminApiError(result.error ?? "Please sign in again.", response.status);
  return result;
}

export function adminPost<T>(path: string, body?: unknown) {
  return adminRequest<T>(path, {
    method: "POST",
    ...(body === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  });
}
