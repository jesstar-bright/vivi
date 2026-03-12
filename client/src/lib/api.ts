const API_TOKEN = import.meta.env.VITE_API_TOKEN || "";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_TOKEN}`,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `API error: ${res.status}`);
    (err as any).body = body;
    (err as any).status = res.status;
    throw err;
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) }),
  postForm: async <T>(path: string, formData: FormData): Promise<T> => {
    const res = await fetch(path, {
      method: "POST",
      headers: { Authorization: `Bearer ${API_TOKEN}` },
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const err = new Error(body.error || `API error: ${res.status}`);
      (err as any).body = body;
      (err as any).status = res.status;
      throw err;
    }
    return res.json();
  },
};
