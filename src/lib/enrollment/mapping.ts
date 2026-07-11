import type { Child, RoomCode, WaitlistEntry } from "./enrollment-logic";
import type { Database } from "@/integrations/supabase/types";

type ChildRow = Database["public"]["Tables"]["enrollment_children"]["Row"];
type WaitlistRow = Database["public"]["Tables"]["enrollment_waitlist"]["Row"];

export interface ChildRecord extends Child { id: string; notes: string | null; startDate: string | null }
export interface WaitlistRecord extends WaitlistEntry { id: string; dateInquired: string | null }

export function rowToChild(r: ChildRow): ChildRecord {
  return {
    id: r.id,
    name: r.name,
    dob: r.dob,
    room: r.room as RoomCode,
    schedule: (r.schedule as "Standard" | "Extended") ?? "Standard",
    status: (r.status as "Active" | "Withdrawn") ?? "Active",
    fallPlan: (r.fall_plan as "SAC" | "Inactive" | "TBD" | null) ?? null,
    parent: r.parent,
    parentPhone: r.parent_phone,
    parentEmail: r.parent_email,
    notes: r.notes,
    startDate: (r as unknown as { start_date: string | null }).start_date ?? null,
    weeklyRateOverride: r.weekly_rate_override ?? null,
    daysPerWeek: r.days_per_week ?? null,
  };
}

export function rowToWaitlist(r: WaitlistRow): WaitlistRecord {
  return {
    id: r.id,
    name: r.name,
    dobOrDueDate: r.dob_or_due_date,
    desiredStart: r.desired_start,
    status: r.status,
    parent: r.parent,
    phone: r.phone,
    email: r.email,
    notes: r.notes,
    dateInquired: r.date_inquired,
  };
}

export const ROOM_ORDER: RoomCode[] = ["F", "I", "G/H", "J/K", "SAC"];

export const ROOM_COLORS: Record<RoomCode, { bg: string; text: string; border: string; label: string }> = {
  F:       { bg: "bg-sky-100",     text: "text-sky-900",     border: "border-sky-300",     label: "Acorns" },
  I:       { bg: "bg-teal-100",    text: "text-teal-900",    border: "border-teal-300",    label: "Pine Cones" },
  "G/H":   { bg: "bg-emerald-100", text: "text-emerald-900", border: "border-emerald-300", label: "Sprouts" },
  "J/K":   { bg: "bg-amber-100",   text: "text-amber-900",   border: "border-amber-300",   label: "Mighty Oaks" },
  SAC:     { bg: "bg-violet-100",  text: "text-violet-900",  border: "border-violet-300",  label: "Mighty Cedars" },
  SUMMER:  { bg: "bg-neutral-200", text: "text-neutral-800", border: "border-neutral-400", label: "Summer" },
};

/** Camp/school-year boundary. Summer camp ends Aug 21; SAC school year
 *  begins the following Monday (week of Aug 24). Update annually. */
export const CAMP_ENDS = new Date(2026, 7, 21);

/** Returns the Monday of the ISO week containing `d` (local time). */
export function mondayOf(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = x.getDay(); // 0 = Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + diff);
  return x;
}

export function formatISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatShort(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatFull(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

/** Child ordering per the director: YOUNGEST at the top (latest DOB first,
 *  so unborn/newest birthdays lead), oldest at the bottom. One continuous
 *  list — no room grouping. Children with a missing DOB sink to the very
 *  bottom so the data flag stays visible. */
export function compareYoungestFirst(a: { dob: string | null }, b: { dob: string | null }): number {
  if (!a.dob && !b.dob) return 0;
  if (!a.dob) return 1;
  if (!b.dob) return -1;
  return b.dob.localeCompare(a.dob);
}

/** Standard child ordering: oldest at the top (earliest DOB first).
 *  Children with a missing DOB sink to the bottom so the data flag
 *  stays visible. ISO dates sort correctly as strings. */
export function compareOldestFirst(a: { dob: string | null }, b: { dob: string | null }): number {
  if (!a.dob && !b.dob) return 0;
  if (!a.dob) return 1;
  if (!b.dob) return -1;
  return a.dob.localeCompare(b.dob);
}

export function ageYearsMonths(dobISO: string, asOf: Date = new Date()): string {
  const dob = new Date(dobISO + "T00:00:00");
  let y = asOf.getFullYear() - dob.getFullYear();
  let m = asOf.getMonth() - dob.getMonth();
  if (asOf.getDate() < dob.getDate()) m -= 1;
  if (m < 0) { y -= 1; m += 12; }
  if (y <= 0) return `${y * 12 + m} mo`;
  return `${y}y ${m}m`;
}