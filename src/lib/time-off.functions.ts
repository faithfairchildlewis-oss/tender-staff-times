import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TimeOffRequest = {
  id: string;
  staff_name: string;
  date_requested: string;
  reason: string;
  status: "pending" | "approved" | "denied";
  created_at: string;
};

export const getTimeOffRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("time_off_requests")
      .select("id, staff_name, date_requested, reason, status, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as TimeOffRequest[];
  });

export const updateTimeOffStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: "pending" | "approved" | "denied" }) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["pending", "approved", "denied"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("time_off_requests")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
