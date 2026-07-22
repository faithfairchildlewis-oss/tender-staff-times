import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FORM_ID = "250027218145145";
const JOTFORM_BASE = "https://api.jotform.com";

export type JotformSubmission = {
  id: string;
  created_at: string;
  child_first: string;
  child_last: string;
  child_name: string;
  gender: string;
  dob: string | null;         // YYYY-MM-DD or null
  due_date: string | null;    // YYYY-MM-DD or null
  born_yet: string;
  age_group: string;
  desired_start_text: string;
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  address: string;
  more_than_one: string;
  notes: string;
  already_imported: boolean;
  dismissed: boolean;
  dismissed_reason: string | null;
};

function pad(n: string | number): string {
  const s = String(n);
  return s.length === 1 ? "0" + s : s;
}

function toIsoDate(m?: string, d?: string, y?: string): string | null {
  if (!m || !d || !y) return null;
  const mm = pad(m);
  const dd = pad(d);
  const yyyy = y.length === 2 ? "20" + y : y;
  const iso = `${yyyy}-${mm}-${dd}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}

function parseDate(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "string") {
    // Common formats: "MM/DD/YYYY", "YYYY-MM-DD"
    const iso = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const us = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (us) return toIsoDate(us[1], us[2], us[3]);
    return null;
  }
  if (typeof val === "object") {
    const o = val as Record<string, string>;
    if (o.month || o.day || o.year) return toIsoDate(o.month, o.day, o.year);
  }
  return null;
}

function normalize(sub: any): JotformSubmission {
  const ans = sub.answers ?? {};
  const get = (id: string) => ans[id]?.answer;
  const name = get("4") ?? {};
  const parent = get("54") ?? {};
  const address = get("23") ?? {};
  const phone = get("27") ?? {};

  const dobRaw = get("24");
  const dueRaw = get("62");
  const addressStr = [
    address.addr_line1,
    address.addr_line2,
    address.city,
    address.state,
    address.postal,
  ].filter(Boolean).join(", ");

  return {
    id: String(sub.id),
    created_at: sub.created_at ?? "",
    child_first: name.first ?? "",
    child_last: name.last ?? "",
    child_name: [name.first, name.middle, name.last].filter(Boolean).join(" ").trim(),
    gender: get("3") ?? "",
    dob: parseDate(dobRaw),
    due_date: parseDate(dueRaw),
    born_yet: get("61") ?? "",
    age_group: get("46") ?? "",
    desired_start_text: get("55") ?? "",
    parent_name: [parent.first, parent.last].filter(Boolean).join(" ").trim(),
    parent_email: get("6") ?? "",
    parent_phone: typeof phone === "object" ? (phone.full ?? "") : String(phone ?? ""),
    address: addressStr,
    more_than_one: get("56") ?? "",
    notes: get("45") ?? "",
    already_imported: false,
    dismissed: false,
    dismissed_reason: null,
  };
}

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error("Authorization check failed");
  if (!data) throw new Error("Forbidden");
}

export const listJotformSubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const apiKey = process.env.JOTFORM_API_KEY;
    if (!apiKey) throw new Error("JOTFORM_API_KEY not configured");

    const url = `${JOTFORM_BASE}/form/${FORM_ID}/submissions?apiKey=${encodeURIComponent(apiKey)}&limit=100&orderby=created_at`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Jotform error ${res.status}: ${body.slice(0, 200)}`);
    }
    const json = await res.json();
    const rows: JotformSubmission[] = (json.content ?? []).map(normalize);

    // Mark already-imported (waitlist notes contain [jotform:<id>])
    const ids = rows.map((r) => r.id);
    if (ids.length) {
      const orExpr = ids.map((id) => `notes.ilike.%[jotform:${id}]%`).join(",");
      const { data: existing } = await context.supabase
        .from("enrollment_waitlist")
        .select("notes")
        .or(orExpr);
      const seen = new Set<string>();
      for (const row of existing ?? []) {
        const m = (row as any).notes?.match(/\[jotform:(\d+)\]/g);
        if (m) for (const mm of m) {
          const g = mm.match(/\[jotform:(\d+)\]/);
          if (g) seen.add(g[1]);
        }
      }
      for (const r of rows) r.already_imported = seen.has(r.id);

      const { data: dismissed } = await context.supabase
        .from("jotform_dismissed")
        .select("submission_id, reason")
        .in("submission_id", ids);
      const dMap = new Map<string, string | null>();
      for (const row of dismissed ?? []) {
        dMap.set((row as any).submission_id, (row as any).reason ?? null);
      }
      for (const r of rows) {
        if (dMap.has(r.id)) {
          r.dismissed = true;
          r.dismissed_reason = dMap.get(r.id) ?? null;
        }
      }
    }

    return rows;
  });

const importSchema = z.object({
  submissionId: z.string().min(1),
  name: z.string().min(1),
  dob_or_due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  desired_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.string().min(1),
  parent: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const importJotformSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => importSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const baseNotes = (data.notes ?? "").trim();
    const marker = `[jotform:${data.submissionId}]`;
    const finalNotes = baseNotes ? `${baseNotes}\n${marker}` : marker;

    const { data: inserted, error } = await context.supabase
      .from("enrollment_waitlist")
      .insert({
        name: data.name,
        dob_or_due_date: data.dob_or_due_date,
        desired_start: data.desired_start,
        status: data.status,
        parent: data.parent || null,
        phone: data.phone || null,
        email: data.email || null,
        date_inquired: new Date().toISOString().slice(0, 10),
        notes: finalNotes,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { id: inserted.id };
  });

const dismissSchema = z.object({
  submissionId: z.string().min(1),
  reason: z.string().max(500).nullable().optional(),
});

export const dismissJotformSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => dismissSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("jotform_dismissed")
      .upsert({
        submission_id: data.submissionId,
        reason: data.reason ?? null,
        dismissed_by: context.userId,
      }, { onConflict: "submission_id" });
    if (error) throw error;
    return { ok: true };
  });

export const undismissJotformSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ submissionId: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("jotform_dismissed")
      .delete()
      .eq("submission_id", data.submissionId);
    if (error) throw error;
    return { ok: true };
  });

// ─────────────── Calendly cross-check ───────────────

export type CalendlyTour = {
  event_uri: string;
  event_name: string;
  start_time: string; // ISO
  status: string;     // active / canceled
  invitee_name: string;
  invitee_email: string;
};

const CALENDLY_GATEWAY = "https://connector-gateway.lovable.dev/calendly";

async function calendlyFetch(path: string, params?: Record<string, string>): Promise<any> {
  const lov = process.env.LOVABLE_API_KEY;
  const cal = process.env.CALENDLY_API_KEY;
  if (!lov || !cal) throw new Error("Calendly connection not configured");
  const url = new URL(`${CALENDLY_GATEWAY}${path}`);
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${lov}`,
      "X-Connection-Api-Key": cal,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Calendly ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

export const listCalendlyTours = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);

    // 1) Find the connected user + organization
    const me = await calendlyFetch("/users/me");
    const userUri: string = me?.resource?.uri;
    const orgUri: string = me?.resource?.current_organization;
    if (!userUri || !orgUri) throw new Error("Could not resolve Calendly user");

    // 2) List scheduled events (last 12 months → next 6 months)
    const now = new Date();
    const minStart = new Date(now.getTime() - 365 * 86400_000).toISOString();
    const maxStart = new Date(now.getTime() + 180 * 86400_000).toISOString();

    const events: any[] = [];
    let nextParams: Record<string, string> | null = {
      organization: orgUri,
      count: "100",
      min_start_time: minStart,
      max_start_time: maxStart,
      status: "active",
    };
    let guard = 0;
    while (nextParams && guard < 10) {
      const page = await calendlyFetch("/scheduled_events", nextParams);
      for (const e of page?.collection ?? []) events.push(e);
      const nextPage: string | null = page?.pagination?.next_page ?? null;
      if (!nextPage) break;
      const u = new URL(nextPage);
      nextParams = Object.fromEntries(u.searchParams.entries());
      guard++;
    }

    // 3) Fetch invitees for each event (parallel)
    const results: CalendlyTour[] = [];
    const inviteeLookups = events.map(async (ev) => {
      const uuid = String(ev.uri ?? "").split("/").pop();
      if (!uuid) return;
      try {
        const inv = await calendlyFetch(`/scheduled_events/${uuid}/invitees`);
        for (const i of inv?.collection ?? []) {
          results.push({
            event_uri: ev.uri,
            event_name: ev.name ?? "Tour",
            start_time: ev.start_time,
            status: i.status ?? ev.status ?? "active",
            invitee_name: i.name ?? "",
            invitee_email: (i.email ?? "").toLowerCase(),
          });
        }
      } catch {
        /* skip individual event failures */
      }
    });
    await Promise.all(inviteeLookups);

    return results;
  });