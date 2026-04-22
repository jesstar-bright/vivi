import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import OnboardingPage from "./pages/OnboardingPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import { bootstrapToken, clearStoredToken } from "@/lib/auth";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const queryClient = new QueryClient();

/**
 * Auth gate sitting between the providers and the router. Decides which of
 * three states to render:
 *   1. No token at all → LoginPage (welcome)
 *   2. Token present but `/api/auth/me` returned 401 → clear, LoginPage (expired)
 *   3. Token + 200 → real app
 *
 * `bootstrapToken()` is called once on mount so an invite-link `?token=...`
 * is captured before we check storage.
 */
const AuthedApp = () => {
  const [hasToken, setHasToken] = useState<boolean>(() => !!bootstrapToken());
  const { data: user, error, isLoading } = useCurrentUser();

  // If /api/auth/me 401s, the stored token is dead — wipe it and show the
  // expired state. We only want this to fire once per bad-token surface.
  useEffect(() => {
    const status = (error as { status?: number } | null)?.status;
    if (status === 401 && hasToken) {
      clearStoredToken();
      setHasToken(false);
    }
  }, [error, hasToken]);

  if (!hasToken) {
    const expired =
      (error as { status?: number } | null)?.status === 401 ? "expired" : null;
    return <LoginPage reason={expired} />;
  }

  // We have a token but haven't yet confirmed it. Render nothing rather
  // than flashing the app — the network round-trip is fast.
  if (isLoading || !user) {
    return <div className="min-h-screen" />;
  }

  // Authenticated but profile incomplete → onboarding gate.
  if (!user.has_profile) {
    return <OnboardingPage />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthedApp />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
