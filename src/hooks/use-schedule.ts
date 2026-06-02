import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fallbackSchedule, type ScheduleData } from "@/data/schedule";

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
    queryFn: async (): Promise<ScheduleData> => {
      // Prefer the schedule marked current that is also live
      const { data: exact, error: err1 } = await supabase
        .from("schedules")
        .select("data")
        .eq("is_current", true)
        .eq("is_live", true)
        .maybeSingle();
      if (exact) return exact.data as ScheduleData;

      // Otherwise, the most recent live schedule
      const { data: recent, error: err2 } = await supabase
        .from("schedules")
        .select("data")
        .eq("is_live", true)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (recent) return recent.data as ScheduleData;

      if (err1 || err2) {
        console.error("schedule fetch failed", err1 || err2);
      }
      return fallbackSchedule;
    },
    staleTime: 60_000,
  });
}

export function useAllSchedules() {
  return useQuery({
    queryKey: ["schedules", "all"],
    queryFn: async (): Promise<ScheduleRow[]> => {
      const { data, error } = await supabase
        .from("schedules")
        .select("id, week_label, start_date, is_current, data, updated_at")
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
        .select("id, week_label, start_date, is_current, data, updated_at")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as ScheduleRow) ?? null;
    },
  });
}