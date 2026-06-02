import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fallbackSchedule, type ScheduleData } from "@/data/schedule";

export type CurrentSchedule = ScheduleData & { start_date?: string | null };

export type ScheduleRow = {
  id: string;
  week_label: string;
  start_date: string;
  is_current: boolean;
  is_live: boolean;
  data: ScheduleData;
  updated_at: string;
};

/** Loads the schedule that is both current and live. Falls back to the most
 *  recent live schedule, then the bundled JSON when the table is empty or the
 *  request fails. */
export function useCurrentSchedule() {
  return useQuery({
    queryKey: ["schedule", "current"],
    queryFn: async (): Promise<CurrentSchedule> => {
      // Prefer the schedule marked current that is also live
      const { data: exact, error: err1 } = await supabase
        .from("schedules")
        .select("data, start_date")
        .eq("is_current", true)
        .eq("is_live", true)
        .maybeSingle();
      if (exact) return { ...(exact.data as ScheduleData), start_date: exact.start_date };

      // Otherwise, the most recent live schedule
      const { data: recent, error: err2 } = await supabase
        .from("schedules")
        .select("data, start_date")
        .eq("is_live", true)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (recent) return { ...(recent.data as ScheduleData), start_date: recent.start_date };

      if (err1 || err2) {
        console.error("schedule fetch failed", err1 || err2);
      }
      return fallbackSchedule;
    },
    staleTime: 60_000,
  });
}

export function useAllSchedules() {
  return useAllSchedulesQuery();
}

/** Loads the most recent schedule marked as Live. Used for the shared
 *  "Our Rooms" view so every staff member sees the same room schedule. */
export function useLiveSchedule() {
  return useQuery({
    queryKey: ["schedule", "live"],
    queryFn: async (): Promise<CurrentSchedule | null> => {
      const { data, error } = await supabase
        .from("schedules")
        .select("data, start_date")
        .eq("is_live", true)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error("live schedule fetch failed", error);
        return null;
      }
      if (!data) return null;
      return { ...(data.data as ScheduleData), start_date: data.start_date };
    },
    staleTime: 60_000,
  });
}

/** Loads ALL schedules marked as Live, oldest first, so the room view can
 *  show multiple weeks side-by-side with horizontal scroll. */
export function useLiveSchedules() {
  return useQuery({
    queryKey: ["schedule", "live", "all"],
    queryFn: async (): Promise<CurrentSchedule[]> => {
      const { data, error } = await supabase
        .from("schedules")
        .select("data, start_date")
        .eq("is_live", true)
        .order("start_date", { ascending: true });
      if (error) {
        console.error("live schedules fetch failed", error);
        return [];
      }
      return (data ?? []).map((r) => ({
        ...(r.data as ScheduleData),
        start_date: r.start_date,
      }));
    },
    staleTime: 60_000,
  });
}

function useAllSchedulesQuery() {
  return useQuery({
    queryKey: ["schedules", "all"],
    queryFn: async (): Promise<ScheduleRow[]> => {
      const { data, error } = await supabase
        .from("schedules")
        .select("id, week_label, start_date, is_current, is_live, data, updated_at")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ScheduleRow[];
    },
  });
}

export function useSchedule(id: string | null) {
  return useQuery({
    queryKey: ["schedules", id],
    enabled: !!id,
    queryFn: async (): Promise<ScheduleRow | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("schedules")
        .select("id, week_label, start_date, is_current, is_live, data, updated_at")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as ScheduleRow) ?? null;
    },
  });
}

/** Admin-only: load per-staff pay rates for a given schedule from the
 *  access-controlled `payroll_rates` table. Returns an empty object for
 *  non-admins (RLS will return no rows). */
export function usePayrollRates(scheduleId: string | null) {
  return useQuery({
    queryKey: ["payroll_rates", scheduleId],
    enabled: !!scheduleId,
    queryFn: async (): Promise<Record<string, number>> => {
      if (!scheduleId) return {};
      const { data, error } = await supabase
        .from("payroll_rates")
        .select("staff_name, rate")
        .eq("schedule_id", scheduleId);
      if (error) {
        console.error("payroll_rates fetch failed", error);
        return {};
      }
      const out: Record<string, number> = {};
      for (const r of data ?? []) out[r.staff_name as string] = Number(r.rate);
      return out;
    },
  });
}