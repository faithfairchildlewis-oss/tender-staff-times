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

export const createTimeOffRequest = createServerFn({ method: "POST" })
  .inputValidator((input: { staff_name: string; date_requested: string; reason: string }) =>
    z.object({
      staff_name: z.string().trim().min(1).max(100),
      date_requested: z.string().trim().min(1).max(200),
      reason: z.string().trim().min(1).max(1000),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("time_off_requests")
      .insert({
        staff_name: data.staff_name,
        date_requested: data.date_requested,
        reason: data.reason,
        status: "pending",
      });
    if (error) throw error;
    return { ok: true };
  });
