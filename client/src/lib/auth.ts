/**
 * Per-user auth token storage + URL bootstrap helpers.
 *
 * The backend now issues a unique bearer token per user. The token is stored
 * in localStorage so it survives reloads. New users typically arrive via an
 * invite link of the form `https://crea.app/?token=xxx` — `bootstrapToken()`
 * extracts that on first load, persists it, and cleans up the URL.
 */

const STORAGE_KEY = "crea_token";

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    // localStorage can throw in private mode / disabled storage.
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // Swallow — caller continues; next request will just be unauth'd.
  }
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Same — best-effort.
  }
}

/**
 * Read `?token=...` from the current URL. If found, strip it from the
 * address bar via `history.replaceState` so the secret doesn't linger
 * in browser history / shoulder-surf range.
 */
export function extractTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (!token) return null;

  params.delete("token");
  const remaining = params.toString();
  const newUrl =
    window.location.pathname +
    (remaining ? `?${remaining}` : "") +
    window.location.hash;

  try {
    window.history.replaceState({}, "", newUrl);
  } catch {
    // If replaceState is blocked we still return the token — UX impact only.
  }

  return token;
}

/**
 * Call once at app startup. Resolves the active token from URL > storage.
 * If a URL token is found it's persisted so future loads skip the URL step.
 */
export function bootstrapToken(): string | null {
  const fromUrl = extractTokenFromUrl();
  if (fromUrl) {
    setStoredToken(fromUrl);
    return fromUrl;
  }
  return getStoredToken();
}
