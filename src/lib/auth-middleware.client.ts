import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

// Track the current access token in module scope so the function middleware
// can attach it synchronously. `supabase.auth.getSession()` acquires an
// internal async lock and can resolve to `null` while another auth call is
// in flight (e.g. concurrent RPCs, background token refresh) — that race
// caused POST server-fn calls to ship with no Authorization header while
// GETs on the same page succeeded.
let currentToken: string | null = null;

if (typeof window !== "undefined") {
  void supabase.auth.getSession().then(({ data }) => {
    currentToken = data.session?.access_token ?? currentToken;
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    currentToken = session?.access_token ?? null;
  });
}

export const attachSupabaseAuthCached = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    let token = currentToken;
    if (!token) {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token ?? null;
      if (token) currentToken = token;
    }
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);