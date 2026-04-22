import { useCurrentUser } from "@/hooks/useCurrentUser";
import { clearStoredToken } from "@/lib/auth";

/**
 * Small "Logged in as Name · Sign out" strip. Renders nothing if the
 * current user hasn't been resolved yet — the auth gate in App.tsx
 * already guarantees we won't get this far without a token, but the
 * actual identity may still be in flight on a slow network.
 */
const UserBadge = () => {
  const { data: user } = useCurrentUser();
  if (!user) return null;

  const handleSignOut = () => {
    clearStoredToken();
    // Hard reload returns to the LoginPage with no stale React Query cache.
    window.location.href = "/";
  };

  return (
    <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground mb-3">
      <span className="truncate">
        Signed in as{" "}
        <span className="text-foreground font-bold">{user.name}</span>
      </span>
      <button
        type="button"
        onClick={handleSignOut}
        className="text-primary hover:underline shrink-0 ml-2"
      >
        Sign out
      </button>
    </div>
  );
};

export default UserBadge;
