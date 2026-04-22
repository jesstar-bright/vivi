import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface CurrentUser {
  user_id: number;
  name: string;
  has_profile: boolean;
}

const FIVE_MINUTES_MS = 5 * 60 * 1000;

/**
 * Resolve the user that owns the currently stored bearer token.
 *
 * Backed by `GET /api/auth/me`. A 401 surfaces as a query error — the
 * caller (typically `App.tsx`) decides whether to clear the token and
 * boot the user back to the login page. Cache for 5 minutes since the
 * identity of the token holder doesn't change underneath us.
 */
export function useCurrentUser(): UseQueryResult<CurrentUser, Error> {
  return useQuery<CurrentUser, Error>({
    queryKey: ["currentUser"],
    queryFn: () => api.get<CurrentUser>("/api/auth/me"),
    staleTime: FIVE_MINUTES_MS,
    // 401 means the token is bad — no point retrying.
    retry: (failureCount, error) => {
      const status = (error as { status?: number } | null)?.status;
      if (status === 401) return false;
      return failureCount < 2;
    },
  });
}
