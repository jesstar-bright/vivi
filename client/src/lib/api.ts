import { getStoredToken } from "@/lib/auth";

/**
 * Build the auth header for the current request. Reads the token at call
 * time (not at module load) so a fresh login takes effect immediately
 * without a page reload. If no token is present we still send the request
 * with no Authorization header — the backend will reject with 401 for any
 * endpoint that requires auth.
 */
function authHeader(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      [key: string]: unknown;
    };
    const err = new Error(body.error || `API error: ${res.status}`) as Error & {
      body: typeof body;
      status: number;
    };
    err.body = body;
    err.status = res.status;
    throw err;
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  postForm: async <T>(path: string, formData: FormData): Promise<T> => {
    const res = await fetch(path, {
      method: "POST",
      headers: { ...authHeader() },
      body: formData,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        [key: string]: unknown;
      };
      const err = new Error(
        body.error || `API error: ${res.status}`,
      ) as Error & { body: typeof body; status: number };
      err.body = body;
      err.status = res.status;
      throw err;
    }
    return res.json();
  },
};
