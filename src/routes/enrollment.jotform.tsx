import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, Download, CheckCircle2, XCircle, Undo2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listJotformSubmissions,
  importJotformSubmission,
  dismissJotformSubmission,
  undismissJotformSubmission,
  listCalendlyTours,
  type JotformSubmission,
  type CalendlyTour,
} from "@/lib/jotform.functions";

const STATUSES = ["Inquiry", "Touring", "Deposit paid", "Hold – deposit pending", "Enrolled", "Withdrawn"];

export const Route = createFileRoute("/enrollment/jotform")({
  component: JotformImportPage,
});

type Draft = {
  name: string;
  dob_or_due_date: string;
  desired_start: string;
  status: string;
  parent: string;
  phone: string;
  email: string;
  notes: string;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function normName(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

type MatchHit = { where: "roster" | "waitlist"; name: string; extra?: string };

function buildDraft(sub: JotformSubmission): Draft {
  const dobOrDue = sub.dob ?? sub.due_date ?? "";
  const noteParts: string[] = [];
  if (sub.age_group) noteParts.push(`Age group: ${sub.age_group}`);
  if (sub.born_yet) noteParts.push(`Born yet: ${sub.born_yet}`);
  if (sub.desired_start_text) noteParts.push(`Requested start: ${sub.desired_start_text}`);
  if (sub.gender) noteParts.push(`Gender: ${sub.gender}`);
  if (sub.more_than_one) noteParts.push(`Multiple children: ${sub.more_than_one}`);
  if (sub.address) noteParts.push(`Address: ${sub.address}`);
  if (sub.notes) noteParts.push(`\n${sub.notes}`);

  return {
    name: sub.child_name || `${sub.child_first} ${sub.child_last}`.trim(),
    dob_or_due_date: dobOrDue,
    desired_start: today(),
    status: "Inquiry",
    parent: sub.parent_name,
    phone: sub.parent_phone,
    email: sub.parent_email,
    notes: noteParts.join("\n"),
  };
}

function JotformImportPage() {
  const fetchList = useServerFn(listJotformSubmissions);
  const doImport = useServerFn(importJotformSubmission);
  const doDismiss = useServerFn(dismissJotformSubmission);
  const doUndismiss = useServerFn(undismissJotformSubmission);
  const fetchTours = useServerFn(listCalendlyTours);
  const qc = useQueryClient();

  const { data: subs = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["jotform", "child-inquiry"],
    queryFn: () => fetchList(),
  });

  const { data: roster = [] } = useQuery({
    queryKey: ["enrollment_children", "match-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollment_children")
        .select("name, dob, room, status");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: waitlist = [] } = useQuery({
    queryKey: ["enrollment_waitlist", "match-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollment_waitlist")
        .select("name, dob_or_due_date, status");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: tours = [], error: toursError } = useQuery({
    queryKey: ["calendly", "tours"],
    queryFn: () => fetchTours(),
    staleTime: 60_000,
    retry: false,
  });

  const toursByEmail = useMemo(() => {
    const m = new Map<string, CalendlyTour[]>();
    for (const t of tours as CalendlyTour[]) {
      if (!t.invitee_email) continue;
      const arr = m.get(t.invitee_email) ?? [];
      arr.push(t);
      m.set(t.invitee_email, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.start_time.localeCompare(b.start_time));
    return m;
  }, [tours]);

  function findTour(sub: JotformSubmission): CalendlyTour | null {
    const email = (sub.parent_email || "").toLowerCase().trim();
    if (!email) return null;
    const arr = toursByEmail.get(email);
    if (!arr || arr.length === 0) return null;
    const active = arr.filter((t) => t.status !== "canceled");
    return active[active.length - 1] ?? arr[arr.length - 1] ?? null;
  }

  function fmtTour(t: CalendlyTour): string {
    const d = new Date(t.start_time);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  const findMatch = useMemo(() => {
    const rosterByName = new Map<string, { name: string; dob: string | null; room: string | null; status: string | null }>();
    for (const r of roster as any[]) rosterByName.set(normName(r.name), r);
    const waitByName = new Map<string, { name: string; dob_or_due_date: string | null; status: string | null }>();
    for (const w of waitlist as any[]) waitByName.set(normName(w.name), w);
    return (sub: JotformSubmission): MatchHit | null => {
      const candidates = [
        sub.child_name,
        `${sub.child_first} ${sub.child_last}`,
      ].map(normName).filter(Boolean);
      for (const key of candidates) {
        const r = rosterByName.get(key);
        if (r) return { where: "roster", name: r.name, extra: [r.room, r.status].filter(Boolean).join(" · ") };
        const w = waitByName.get(key);
        if (w) return { where: "waitlist", name: w.name, extra: w.status ?? undefined };
      }
      return null;
    };
  }, [roster, waitlist]);

  const [showImported, setShowImported] = useState(false);
  const [showDeclined, setShowDeclined] = useState(false);
  const [selected, setSelected] = useState<JotformSubmission | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const filtered = useMemo(() => {
    return subs.filter((s) => {
      if (!showImported && s.already_imported) return false;
      if (!showDeclined && s.dismissed) return false;
      return true;
    });
  }, [subs, showImported, showDeclined]);

  const importMut = useMutation({
    mutationFn: async (input: { sub: JotformSubmission; draft: Draft }) => {
      return await doImport({
        data: {
          submissionId: input.sub.id,
          name: input.draft.name.trim(),
          dob_or_due_date: input.draft.dob_or_due_date,
          desired_start: input.draft.desired_start,
          status: input.draft.status,
          parent: input.draft.parent.trim() || null,
          phone: input.draft.phone.trim() || null,
          email: input.draft.email.trim() || null,
          notes: input.draft.notes.trim() || null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Added to waitlist");
      qc.invalidateQueries({ queryKey: ["waitlist"] });
      qc.invalidateQueries({ queryKey: ["jotform", "child-inquiry"] });
      setSelected(null);
      setDraft(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Import failed"),
  });

  const dismissMut = useMutation({
    mutationFn: async (input: { submissionId: string; reason?: string | null }) => {
      return await doDismiss({ data: { submissionId: input.submissionId, reason: input.reason ?? null } });
    },
    onSuccess: () => {
      toast.success("Marked as declined");
      qc.invalidateQueries({ queryKey: ["jotform", "child-inquiry"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to decline"),
  });

  const undismissMut = useMutation({
    mutationFn: async (submissionId: string) => {
      return await doUndismiss({ data: { submissionId } });
    },
    onSuccess: () => {
      toast.success("Restored");
      qc.invalidateQueries({ queryKey: ["jotform", "child-inquiry"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to restore"),
  });

  function openReview(sub: JotformSubmission) {
    setSelected(sub);
    setDraft(buildDraft(sub));
  }

  function handleDecline(sub: JotformSubmission) {
    const reason = window.prompt("Reason for declining (optional):", "") ?? "";
    dismissMut.mutate({ submissionId: sub.id, reason: reason.trim() || null });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Jotform — Child Inquiry Form</h2>
          <p className="text-sm text-muted-foreground">
            Review recent submissions and import each one into the waitlist.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showImported}
              onChange={(e) => setShowImported(e.target.checked)}
            />
            Show already imported
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showDeclined}
              onChange={(e) => setShowDeclined(e.target.checked)}
            />
            Show declined
          </label>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="p-4 border-destructive text-destructive text-sm">
          {(error as Error).message}
        </Card>
      )}

      {toursError && (
        <Card className="p-3 text-xs text-muted-foreground">
          Couldn't load Calendly tours: {(toursError as Error).message}
        </Card>
      )}

      {isLoading ? (
        <Card className="p-6 text-sm text-muted-foreground">Loading submissions…</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">
          {subs.length === 0 ? "No submissions found." : "All submissions have been imported."}
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <Card key={s.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{s.child_name || "(no name)"}</span>
                  {s.age_group && <Badge variant="secondary">{s.age_group}</Badge>}
                  {s.already_imported && (
                    <Badge className="bg-green-600 text-white">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Imported
                    </Badge>
                  )}
                  {s.dismissed && (
                    <Badge className="bg-slate-500 text-white">
                      <XCircle className="h-3 w-3 mr-1" /> Declined
                    </Badge>
                  )}
                  {(() => {
                    const t = findTour(s);
                    if (!t) return null;
                    return (
                      <Badge className={t.status === "canceled" ? "bg-rose-600 text-white" : "bg-purple-600 text-white"}>
                        <Calendar className="h-3 w-3 mr-1" />
                        {t.status === "canceled" ? "Tour canceled" : "Tour"} · {fmtTour(t)}
                      </Badge>
                    );
                  })()}
                  {(() => {
                    const m = findMatch(s);
                    if (!m) return null;
                    return (
                      <Badge className={m.where === "roster" ? "bg-blue-600 text-white" : "bg-amber-500 text-white"}>
                        {m.where === "roster" ? "On roster" : "On waitlist"}
                        {m.extra ? ` · ${m.extra}` : ""}
                      </Badge>
                    );
                  })()}
                </div>
                <div className="text-xs text-muted-foreground mt-1 space-x-2">
                  <span>Submitted {s.created_at.slice(0, 10)}</span>
                  {s.dob && <span>• DOB {s.dob}</span>}
                  {!s.dob && s.due_date && <span>• Due {s.due_date}</span>}
                  {s.desired_start_text && <span>• Wants start: {s.desired_start_text}</span>}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {s.parent_name && <>Parent: {s.parent_name} </>}
                  {s.parent_phone && <>• {s.parent_phone} </>}
                  {s.parent_email && <>• {s.parent_email}</>}
                </div>
                {s.dismissed && s.dismissed_reason && (
                  <div className="text-xs text-muted-foreground mt-1 italic">
                    Reason: {s.dismissed_reason}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {s.dismissed ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => undismissMut.mutate(s.id)}
                    disabled={undismissMut.isPending}
                  >
                    <Undo2 className="h-4 w-4 mr-1" /> Restore
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      onClick={() => openReview(s)}
                      disabled={s.already_imported}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      {s.already_imported ? "Imported" : "Review & Import"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDecline(s)}
                      disabled={dismissMut.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Decline
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setDraft(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review & import to waitlist</DialogTitle>
          </DialogHeader>
          {selected && draft && (
            <div className="space-y-3">
              <div>
                <Label>Child name</Label>
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>DOB or Due date</Label>
                  <Input
                    type="date"
                    value={draft.dob_or_due_date}
                    onChange={(e) => setDraft({ ...draft, dob_or_due_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Desired start</Label>
                  <Input
                    type="date"
                    value={draft.desired_start}
                    onChange={(e) => setDraft({ ...draft, desired_start: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Parent / Guardian</Label>
                <Input value={draft.parent} onChange={(e) => setDraft({ ...draft, parent: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Phone</Label>
                  <Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={draft.notes}
                  rows={6}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelected(null); setDraft(null); }}>Cancel</Button>
            <Button
              disabled={
                !draft ||
                !draft.name.trim() ||
                !/^\d{4}-\d{2}-\d{2}$/.test(draft.dob_or_due_date) ||
                !/^\d{4}-\d{2}-\d{2}$/.test(draft.desired_start) ||
                importMut.isPending
              }
              onClick={() => selected && draft && importMut.mutate({ sub: selected, draft })}
            >
              {importMut.isPending ? "Importing…" : "Import to Waitlist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}