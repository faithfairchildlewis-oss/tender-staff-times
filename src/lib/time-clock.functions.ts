import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TimeClockEntry = {
  id: string;
  staff_name: string;
  clock_in: string;
  clock_out: string | null;
  created_at: string;
};

const nameSchema = z.string().trim().min(1).max(100);
const pinSchema = z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits");

export const getClockStatus = createServerFn({ method: "POST" })
  .inputValidator((input: { staff_name: string }) =>
    z.object({ staff_name: nameSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [openRes, pinRes] = await Promise.all([
      supabaseAdmin
        .from("time_clock_entries")
        .select("id, clock_in")
        .eq("staff_name", data.staff_name)
        .is("clock_out", null)
        .order("clock_in", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("staff_pins")
        .select("staff_name")
        .eq("staff_name", data.staff_name)
        .maybeSingle(),
    ]);
    if (openRes.error) throw openRes.error;
    if (pinRes.error) throw pinRes.error;
    return {
      clocked_in: !!openRes.data,
      clock_in: openRes.data?.clock_in ?? null,
      pin_set: !!pinRes.data,
    };
  });

export const setStaffPin = createServerFn({ method: "POST" })
  .inputValidator((input: { staff_name: string; pin: string }) =>
    z.object({ staff_name: nameSchema, pin: pinSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.rpc("set_staff_pin", {
      _staff_name: data.staff_name,
      _pin: data.pin,
    });
    if (error) throw error;
    if (!created) {
      throw new Error(
        "A PIN is already set for this name. Ask a director to reset it for you.",
      );
    }
    return { ok: true };
  });

async function verifyPin(staffName: string, pin: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("verify_staff_pin", {
    _staff_name: staffName,
    _pin: pin,
  });
  if (error) throw error;
  if (!data) throw new Error("Incorrect PIN. Please try again.");
  return supabaseAdmin;
}

export const clockIn = createServerFn({ method: "POST" })
  .inputValidator((input: { staff_name: string; pin: string }) =>
    z.object({ staff_name: nameSchema, pin: pinSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const supabaseAdmin = await verifyPin(data.staff_name, data.pin);
    const { data: open, error: openErr } = await supabaseAdmin
      .from("time_clock_entries")
      .select("id")
      .eq("staff_name", data.staff_name)
      .is("clock_out", null)
      .limit(1)
      .maybeSingle();
    if (openErr) throw openErr;
    if (open) throw new Error("You are already clocked in.");
    const { error } = await supabaseAdmin
      .from("time_clock_entries")
      .insert({ staff_name: data.staff_name, clock_in: new Date().toISOString() });
    if (error) throw error;
    return { ok: true };
  });

export const clockOut = createServerFn({ method: "POST" })
  .inputValidator((input: { staff_name: string; pin: string }) =>
    z.object({ staff_name: nameSchema, pin: pinSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const supabaseAdmin = await verifyPin(data.staff_name, data.pin);
    const { data: open, error: openErr } = await supabaseAdmin
      .from("time_clock_entries")
      .select("id")
      .eq("staff_name", data.staff_name)
      .is("clock_out", null)
      .order("clock_in", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (openErr) throw openErr;
    if (!open) throw new Error("You are not clocked in.");
    const { error } = await supabaseAdmin
      .from("time_clock_entries")
      .update({ clock_out: new Date().toISOString() })
      .eq("id", open.id);
    if (error) throw error;
    return { ok: true };
  });

export const getTimeClockEntries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleError) throw roleError;
    if (!isAdmin) throw new Error("Forbidden");
    const { data, error } = await supabase
      .from("time_clock_entries")
      .select("id, staff_name, clock_in, clock_out, created_at")
      .order("clock_in", { ascending: false });
    if (error) throw error;
    return (data ?? []) as TimeClockEntry[];
  });
