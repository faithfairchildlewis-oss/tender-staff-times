import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/** Route guard: only signed-in admins may continue. */
export async function requireAdmin() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw redirect({ to: "/login" });
  const { data: roleRow, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (roleError || !roleRow) throw redirect({ to: "/" });
}
