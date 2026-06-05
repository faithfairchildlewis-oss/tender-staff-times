import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TimeOffRequest = {
  id: string;
  staff_name: string;
  date_requested: string;
  date_from: string | null;
  date_to: string | null;
  reason: string;
  status: "pending" | "approved" | "denied";
  created_at: string;
  decided_by: string | null;
  decided_by_email: string | null;
  decided_at: string | null;
};

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[m - 1]} ${d}, ${y}`;
}

function formatDateRange(dateFrom: string, dateTo?: string | null): string {
  if (!dateTo || dateFrom === dateTo) {
    return fmtDate(dateFrom);
  }
  const from = fmtDate(dateFrom);
  const to = fmtDate(dateTo);
  const fromComma = from.lastIndexOf(",");
  const toComma = to.lastIndexOf(",");
  const fromYear = from.slice(fromComma + 2);
  const toYear = to.slice(toComma + 2);
  if (fromYear === toYear) {
    const fromSpace = from.indexOf(" ");
    const toSpace = to.indexOf(" ");
    const fromMonth = from.slice(0, fromSpace);
    const toMonth = to.slice(0, toSpace);
    if (fromMonth === toMonth) {
      const fromDay = from.slice(fromSpace + 1, fromComma);
      const toDay = to.slice(toSpace + 1, toComma);
      return `${fromMonth} ${fromDay}–${toDay}, ${fromYear}`;
    } else {
      const fromRest = from.slice(0, fromComma);
      const toRest = to.slice(0, toComma);
      return `${fromRest}–${toRest}, ${fromYear}`;
    }
  }
  return `${from}–${to}`;
}

export const getTimeOffRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("time_off_requests")
      .select("id, staff_name, date_requested, date_from, date_to, reason, status, created_at, decided_by, decided_by_email, decided_at")
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
    const { supabase, userId, claims } = context;
    const isDecision = data.status === "approved" || data.status === "denied";
    const patch = isDecision
      ? {
          status: data.status,
          decided_by: userId,
          decided_by_email: (claims as { email?: string } | null)?.email ?? null,
          decided_at: new Date().toISOString(),
        }
      : {
          status: data.status,
          decided_by: null,
          decided_by_email: null,
          decided_at: null,
        };
    const { error } = await supabase
      .from("time_off_requests")
      .update(patch)
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const createTimeOffRequest = createServerFn({ method: "POST" })
  .inputValidator((input: { staff_name: string; date_from: string; date_to?: string | null; reason: string }) =>
    z.object({
      staff_name: z.string().trim().min(1).max(100),
      date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      reason: z.string().trim().min(1).max(1000),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const dateTo = data.date_to && data.date_to >= data.date_from ? data.date_to : null;
    const dateRequested = formatDateRange(data.date_from, dateTo);
    const { error } = await supabaseAdmin
      .from("time_off_requests")
      .insert({
        staff_name: data.staff_name,
        date_requested: dateRequested,
        date_from: data.date_from,
        date_to: dateTo,
        reason: data.reason,
        status: "pending",
      });
    if (error) throw error;
    return { ok: true };
  });
