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

/** Loads the schedule marked as current. Falls back to the bundled JSON
 *  when the table is empty or the request fails. */
export function useCurrentSchedule() {
  return useQuery({
    queryKey: ["schedule", "current"],
    queryFn: async (): Promise<ScheduleData> => {
      const { data, error } = await supabase
        .from("schedules")
        .select("data")
        .eq("is_current", true)
        .maybeSingle();
      if (error) {
        console.error("schedule fetch failed", error);
        return fallbackSchedule;
      }
      return ((data?.data as ScheduleData) ?? fallbackSchedule);
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