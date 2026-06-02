import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Home } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Admin" },
      { name: "description", content: "Sign in to the Tender Years of Deale admin console to manage staff schedules." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Sign in — Admin" },
      { property: "og:description", content: "Sign in to the Tender Years of Deale admin console to manage staff schedules." },
      { property: "og:url", content: "/login" },
    ],
    links: [{ rel: "canonical", href: "/login" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "recover">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onGoogle() {
    setError(null);
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/admin",
      });
      if (result.error) throw new Error(result.error.message ?? "Google sign-in failed");
      if (result.redirected) return;
      navigate({ to: "/admin", replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google sign-in failed");
      setBusy(false);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/admin" },
        });
        if (error) throw error;
      } else if (mode === "recover") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        setSuccess("Check your email for a password-reset link.");
        setEmail("");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      if (mode !== "recover") {
        navigate({ to: "/admin", replace: true });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="bg-primary text-primary-foreground px-5 pt-8 pb-10 rounded-b-3xl shadow-md">
        <Link
          to="/"
          aria-label="Home"
          className="inline-flex items-center gap-1 text-primary-foreground/90 mb-3 min-h-11 -ml-2 px-2 rounded-lg"
        >
          <Home className="w-5 h-5" /> <span className="text-sm">Home</span>
        </Link>
        <h1 className="text-2xl font-bold">
          {mode === "recover" ? "Reset password" : "Admin sign in"}
        </h1>
        <p className="text-base opacity-90 mt-1">
          {mode === "signin" && "Sign in to edit schedules"}
          {mode === "signup" && "Create your admin account"}
          {mode === "recover" && "Enter your email to receive a reset link"}
        </p>
      </header>

      <main className="px-4 -mt-6 max-w-md mx-auto">
        <form
          onSubmit={onSubmit}
          className="bg-card rounded-2xl shadow-sm p-5 space-y-4"
        >
          <label className="block">
            <span className="text-sm font-semibold text-foreground">Email</span>
            <input
              type="email"
              required
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-base min-h-12 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          {mode !== "recover" && (
            <label className="block">
              <span className="text-sm font-semibold text-foreground">Password</span>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-base min-h-12 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          )}
          {error && (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-600" role="status">{success}</p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-primary text-primary-foreground font-semibold py-3 min-h-12 rounded-xl disabled:opacity-60"
          >
            {busy
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : "Send reset link"}
          </button>

          {mode === "signin" && (
            <button
              type="button"
              onClick={() => { setMode("recover"); setError(null); setSuccess(null); }}
              className="w-full text-sm text-primary underline min-h-11"
            >
              Forgot password?
            </button>
          )}

          {mode === "recover" && (
            <button
              type="button"
              onClick={() => { setMode("signin"); setError(null); setSuccess(null); }}
              className="w-full text-sm text-primary underline min-h-11"
            >
              Back to sign in
            </button>
          )}

          {mode !== "recover" && (
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="w-full text-sm text-primary underline min-h-11"
            >
              {mode === "signin"
                ? "First time? Create the admin account"
                : "Have an account? Sign in"}
            </button>
          )}

          {mode === "signup" && (
            <p className="text-xs text-muted-foreground text-center">
              The first account created becomes the admin automatically.
            </p>
          )}

          {mode !== "recover" && (
            <>
              <div className="flex items-center gap-3 pt-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <button
                type="button"
                onClick={onGoogle}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 bg-secondary text-foreground font-semibold py-3 min-h-12 rounded-xl disabled:opacity-60 border border-border"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.01-2.33z"/>
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96L3.97 7.3C4.68 5.17 6.66 3.58 9 3.58z"/>
                </svg>
                Continue with Google
              </button>
            </>
          )}
        </form>
      </main>
    </div>
  );
}
