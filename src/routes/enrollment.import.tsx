import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useChildren } from "@/hooks/use-enrollment";
import { useQueryClient } from "@tanstack/react-query";
import type { ChildRecord } from "@/lib/enrollment/mapping";
import type { RoomCode } from "@/lib/enrollment/enrollment-logic";

export const Route = createFileRoute("/enrollment/import")({
  component: ImportPage,
});

interface ParsedRow {
  name: string;
  dob: string | null;
  room: string | null;
  status: string | null;
  parent: string | null;
  parent_phone: string | null;
  parent_email: string | null;
}

interface Diff {
  news: ParsedRow[];
  departures: ChildRecord[];
  roomChanges: { current: ChildRecord; incoming: ParsedRow }[];
  dobChanges: { current: ChildRecord; incoming: ParsedRow }[];
  unchanged: number;
}

function stripQuotes(s: string | null | undefined): string {
  return (s ?? "").replace(/["']+/g, "").trim();
}

function toISODate(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    const mm = String(d.m).padStart(2, "0");
    const dd = String(d.d).padStart(2, "0");
    return `${d.y}-${mm}-${dd}`;
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function parseWorkbook(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const wb = XLSX.read(reader.result, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
        const parsed: ParsedRow[] = rows.map((r) => {
          const first = stripQuotes(r["first_name"] as string);
          const last = stripQuotes(r["last_name"] as string);
          const name = [first, last].filter(Boolean).join(" ").trim();
          const room = stripQuotes((r["homeroom"] as string) ?? (r["room_1"] as string)) || null;
          return {
            name,
            dob: toISODate(r["birthdate"]),
            room,
            status: (r["enrollment_status"] as string) ?? null,
            parent: stripQuotes([r["parent_1_first_name"], r["parent_1_last_name"]].filter(Boolean).join(" ")) || null,
            parent_phone: (r["parent_1_phone"] as string) ?? (r["parent_1_mobile_phone"] as string) ?? null,
            parent_email: (r["parent_1_email"] as string) ?? null,
          };
        }).filter((r) => r.name);
        resolve(parsed);
      } catch (e) { reject(e); }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

function computeDiff(current: ChildRecord[], incoming: ParsedRow[]): Diff {
  const byName = new Map(current.map((c) => [c.name.toLowerCase(), c]));
  const incomingNames = new Set(incoming.map((r) => r.name.toLowerCase()));
  const news: ParsedRow[] = [];
  const roomChanges: Diff["roomChanges"] = [];
  const dobChanges: Diff["dobChanges"] = [];
  let unchanged = 0;
  for (const row of incoming) {
    const existing = byName.get(row.name.toLowerCase());
    if (!existing) { news.push(row); continue; }
    let changed = false;
    if (row.room && row.room !== existing.room) { roomChanges.push({ current: existing, incoming: row }); changed = true; }
    if (row.dob && row.dob !== existing.dob) { dobChanges.push({ current: existing, incoming: row }); changed = true; }
    if (!changed) unchanged += 1;
  }
  const departures = current.filter((c) => c.status === "Active" && !incomingNames.has(c.name.toLowerCase()));
  return { news, departures, roomChanges, dobChanges, unchanged };
}

function ImportPage() {
  const { data: current = [] } = useChildren();
  const qc = useQueryClient();
  const [incoming, setIncoming] = useState<ParsedRow[] | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const diff = useMemo(() => (incoming ? computeDiff(current, incoming) : null), [current, incoming]);

  const handleFile = async (file: File) => {
    try {
      const rows = await parseWorkbook(file);
      setIncoming(rows);
      setApplied(false);
      toast.success(`Parsed ${rows.length} rows`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to parse file");
    }
  };

  const apply = async () => {
    if (!diff) return;
    if (!confirm(`Apply ${diff.news.length} new, ${diff.departures.length} withdrawn, ${diff.roomChanges.length} room changes, ${diff.dobChanges.length} DOB changes?`)) return;
    setApplying(true);
    try {
      // News
      for (const r of diff.news) {
        await supabase.from("enrollment_children").insert({
          name: r.name,
          dob: r.dob,
          room: (r.room as RoomCode) ?? "F",
          schedule: "Standard",
          status: "Active",
          parent: r.parent,
          parent_phone: r.parent_phone,
          parent_email: r.parent_email,
        });
      }
      // Departures → Withdrawn
      for (const c of diff.departures) {
        await supabase.from("enrollment_children").update({ status: "Withdrawn" }).eq("id", c.id);
      }
      // Room changes
      for (const rc of diff.roomChanges) {
        await supabase.from("enrollment_children").update({ room: rc.incoming.room! }).eq("id", rc.current.id);
      }
      // DOB changes
      for (const dc of diff.dobChanges) {
        await supabase.from("enrollment_children").update({ dob: dc.incoming.dob }).eq("id", dc.current.id);
      }
      qc.invalidateQueries({ queryKey: ["enrollment", "children"] });
      setApplied(true);
      toast.success("Import applied");
    } catch (e) {
      console.error(e);
      toast.error("Import failed — check console");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Brightwheel Import</h2>
        <p className="text-sm text-muted-foreground">Upload the roster export (.xlsx or .csv). Review the diff, then apply. Departures are marked Withdrawn — never deleted.</p>
      </div>

      <Card className="p-4">
        <Label className="text-xs">Roster file</Label>
        <div className="mt-2 flex items-center gap-2">
          <Input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          <Upload className="h-4 w-4 text-muted-foreground" />
        </div>
      </Card>

      {diff && (
        <>
          <div className="grid gap-2 grid-cols-2 md:grid-cols-5 text-sm">
            <Stat label="New" value={diff.news.length} tone="new" />
            <Stat label="Withdrawn" value={diff.departures.length} tone="warn" />
            <Stat label="Room changes" value={diff.roomChanges.length} tone="info" />
            <Stat label="DOB changes" value={diff.dobChanges.length} tone="info" />
            <Stat label="Unchanged" value={diff.unchanged} />
          </div>

          {diff.news.length > 0 && (
            <Section title="New children">
              {diff.news.map((r, i) => (
                <li key={i} className="flex gap-2 text-sm"><Badge>NEW</Badge>{r.name} — {r.room ?? "?"}, DOB {r.dob ?? "?"}</li>
              ))}
            </Section>
          )}
          {diff.departures.length > 0 && (
            <Section title="Will be marked Withdrawn (not deleted)">
              {diff.departures.map((c) => (
                <li key={c.id} className="flex gap-2 text-sm"><Badge variant="destructive">OUT</Badge>{c.name} — {c.room}</li>
              ))}
            </Section>
          )}
          {diff.roomChanges.length > 0 && (
            <Section title="Room changes">
              {diff.roomChanges.map((rc) => (
                <li key={rc.current.id} className="flex gap-2 text-sm"><Badge variant="secondary">MOVE</Badge>{rc.current.name}: {rc.current.room} → {rc.incoming.room}</li>
              ))}
            </Section>
          )}
          {diff.dobChanges.length > 0 && (
            <Section title="Birthday changes">
              {diff.dobChanges.map((dc) => (
                <li key={dc.current.id} className="flex gap-2 text-sm"><Badge variant="secondary">DOB</Badge>{dc.current.name}: {dc.current.dob ?? "?"} → {dc.incoming.dob}</li>
              ))}
            </Section>
          )}

          <div className="flex items-center gap-2">
            <Button onClick={apply} disabled={applying || applied} className="gap-2">
              {applied ? (<><CheckCircle2 className="h-4 w-4" /> Applied</>) : (applying ? "Applying…" : "Apply changes")}
            </Button>
            <Button variant="outline" onClick={() => { setIncoming(null); setApplied(false); }}>Discard</Button>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "new" | "warn" | "info" }) {
  const cls = tone === "new" ? "border-emerald-300 bg-emerald-50" : tone === "warn" ? "border-amber-300 bg-amber-50" : tone === "info" ? "border-sky-300 bg-sky-50" : "";
  return (
    <div className={`rounded border p-3 ${cls}`}>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-3">
      <div className="text-sm font-semibold mb-2">{title}</div>
      <ul className="space-y-1">{children}</ul>
    </Card>
  );
}