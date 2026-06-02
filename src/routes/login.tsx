import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Admin" }] }),
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
          aria-label="Back to staff app"
          className="inline-flex items-center gap-1 text-primary-foreground/90 mb-3 min-h-11 -ml-2 px-2 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" /> <span className="text-sm">Back</span>
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
        </form>
      </main>
    </div>
  );
}
