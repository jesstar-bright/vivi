import { useState, type FormEvent } from "react";
import DiamondLogo from "@/components/DiamondLogo";
import { Input } from "@/components/ui/input";
import { setStoredToken } from "@/lib/auth";

interface LoginPageProps {
  /**
   * Optional reason we're showing the login screen — e.g. when the stored
   * token came back 401, we surface "session expired" instead of the
   * default welcome copy.
   */
  reason?: "expired" | null;
}

const LoginPage = ({ reason = null }: LoginPageProps) => {
  const [token, setToken] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = token.trim();
    if (!trimmed) return;
    setStoredToken(trimmed);
    // Hard reload — re-runs bootstrap and re-fetches /api/auth/me cleanly.
    window.location.href = "/";
  };

  const headline = reason === "expired" ? "Welcome back" : "Welcome to Crea";
  const body =
    reason === "expired"
      ? "Your session expired. Click your invite link again, or paste your token below."
      : "If you have an invite link, just click it. Or paste your token below to continue.";

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="mb-5">
            <DiamondLogo size={56} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">
            {headline}
          </h1>
          <p className="text-sm text-muted-foreground font-medium leading-relaxed max-w-xs">
            {body}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card-elevated space-y-3">
          <label
            htmlFor="crea-token"
            className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Access token
          </label>
          <Input
            id="crea-token"
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste your token"
            className="h-11 text-sm"
          />
          <button
            type="submit"
            disabled={!token.trim()}
            className="btn-primary w-full disabled:opacity-50 disabled:active:scale-100"
          >
            Continue
          </button>
        </form>

        <p className="text-center text-[11px] text-muted-foreground mt-6">
          Crea is invite-only while we're in early access.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
