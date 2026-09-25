import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Lock } from "lucide-react";
import { unlockSite } from "@/lib/gate.functions";

export const Route = createFileRoute("/unlock")({
  head: () => ({
    meta: [
      { title: "Enter Password — Tender Years of Deale" },
      { name: "description", content: "Enter the staff password to view the schedule." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: UnlockPage,
});

function UnlockPage() {
  const router = useRouter();
  const unlock = useServerFn(unlockSite);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(false);
    setBusy(true);
    const { ok } = await unlock({ data: { password } });
    if (ok) {
      await router.navigate({ to: "/" });
    } else {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">
              Tender Years of Deale
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the staff password to continue
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-4 py-3 text-center text-lg text-foreground outline-none ring-ring transition focus:ring-2"
              placeholder="Password"
            />
            {error && (
              <p className="text-center text-sm text-destructive">
                Incorrect password — please try again.
              </p>
            )}
            <button
              type="submit"
              disabled={busy || !password}
              className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? "Checking…" : "Enter"}
            </button>
          </form>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Staff only · Unauthorized access prohibited
        </p>
      </div>
    </div>
  );
}
