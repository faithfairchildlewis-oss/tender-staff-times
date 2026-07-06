import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { rowToChild, rowToWaitlist, type ChildRecord, type WaitlistRecord } from "@/lib/enrollment/mapping";
import type { Database } from "@/integrations/supabase/types";

type ChildInsert = Database["public"]["Tables"]["enrollment_children"]["Insert"];
type ChildUpdate = Database["public"]["Tables"]["enrollment_children"]["Update"];
type WaitlistInsert = Database["public"]["Tables"]["enrollment_waitlist"]["Insert"];
type WaitlistUpdate = Database["public"]["Tables"]["enrollment_waitlist"]["Update"];

export function useChildren() {
  return useQuery({
    queryKey: ["enrollment", "children"],
    queryFn: async (): Promise<ChildRecord[]> => {
      const { data, error } = await supabase.from("enrollment_children").select("*").order("name");
      if (error) throw error;
      return (data ?? []).map(rowToChild);
    },
    staleTime: 60_000,
  });
}

export function useWaitlist() {
  return useQuery({
    queryKey: ["enrollment", "waitlist"],
    queryFn: async (): Promise<WaitlistRecord[]> => {
      const { data, error } = await supabase.from("enrollment_waitlist").select("*").order("desired_start");
      if (error) {
        // Non-admins are blocked by RLS; treat as empty.
        if (error.code === "PGRST301" || error.message?.toLowerCase().includes("permission")) {
          return [];
        }
        throw error;
      }
      return (data ?? []).map(rowToWaitlist);
    },
    staleTime: 60_000,
  });
}

export function useRooms() {
  return useQuery({
    queryKey: ["enrollment", "rooms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("enrollment_rooms").select("*").order("code");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

export function useUpsertChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ChildInsert & { id?: string }) => {
      if (payload.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from("enrollment_children").update(rest as ChildUpdate).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("enrollment_children").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["enrollment", "children"] }),
  });
}

export function useWithdrawChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("enrollment_children").update({ status: "Withdrawn" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["enrollment", "children"] }),
  });
}

export function useUpsertWaitlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: WaitlistInsert & { id?: string }) => {
      if (payload.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from("enrollment_waitlist").update(rest as WaitlistUpdate).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("enrollment_waitlist").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["enrollment", "waitlist"] }),
  });
}

export function useDeleteWaitlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("enrollment_waitlist").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["enrollment", "waitlist"] }),
  });
}

export function useConvertWaitlistToChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ waitlist, child }: { waitlist: WaitlistRecord; child: ChildInsert }) => {
      const { error: insErr } = await supabase.from("enrollment_children").insert(child);
      if (insErr) throw insErr;
      const { error: updErr } = await supabase
        .from("enrollment_waitlist")
        .update({ status: "Enrolled" })
        .eq("id", waitlist.id);
      if (updErr) throw updErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["enrollment", "children"] });
      qc.invalidateQueries({ queryKey: ["enrollment", "waitlist"] });
    },
  });
}