import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Supabase recovery links come in two formats:
    // 1) PKCE: ?code=... in the query string -> exchangeCodeForSession
    // 2) Legacy: #access_token=...&refresh_token=...&type=recovery -> setSession
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    const hashType = hash.get("type");

    const finish = (ok: boolean, msg?: string) => {
      if (ok) {
        setIsRecovery(true);
        // Clean the URL so tokens don't linger
        window.history.replaceState({}, "", window.location.pathname);
      } else if (msg) {
        setError(msg);
      }
    };

    if (code) {
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error }) => finish(!error, error?.message))
        .catch((e) => finish(false, e?.message));
    } else if (accessToken && refreshToken && hashType === "recovery") {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => finish(!error, error?.message))
        .catch((e) => finish(false, e?.message));
    } else {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) setIsRecovery(true);
      });
    }

    // Supabase also fires PASSWORD_RECOVERY when it detects a recovery link
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setIsRecovery(true);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess("Password updated. Redirecting to admin…");
      setTimeout(() => navigate({ to: "/admin", replace: true }), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="bg-primary text-primary-foreground px-5 pt-8 pb-10 rounded-b-3xl shadow-md">
        <Link
          to="/login"
          aria-label="Back to login"
          className="inline-flex items-center gap-1 text-primary-foreground/90 mb-3 min-h-11 -ml-2 px-2 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" /> <span className="text-sm">Back</span>
        </Link>
        <h1 className="text-2xl font-bold">Set new password</h1>
        <p className="text-base opacity-90 mt-1">
          Choose a strong password for your account.
        </p>
      </header>

      <main className="px-4 -mt-6 max-w-md mx-auto">
        {!isRecovery && !success && (
          <div className="bg-card rounded-2xl shadow-sm p-5">
            <p className="text-sm text-muted-foreground">
              This page only works from a password-reset email link. If you already have a session, you can still change your password below.
            </p>
          </div>
        )}

        <form
          onSubmit={onSubmit}
          className="bg-card rounded-2xl shadow-sm p-5 space-y-4"
        >
          <label className="block">
            <span className="text-sm font-semibold text-foreground">New password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-base min-h-12 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-foreground">Confirm password</span>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              autoComplete="new-password"
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-base min-h-12 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
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
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>
      </main>
    </div>
  );
}
