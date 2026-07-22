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
import { RefreshCw, Download, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  listJotformSubmissions,
  importJotformSubmission,
  type JotformSubmission,
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
  const qc = useQueryClient();

  const { data: subs = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["jotform", "child-inquiry"],
    queryFn: () => fetchList(),
  });

  const [showImported, setShowImported] = useState(false);
  const [selected, setSelected] = useState<JotformSubmission | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const filtered = useMemo(() => {
    return showImported ? subs : subs.filter((s) => !s.already_imported);
  }, [subs, showImported]);

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

  function openReview(sub: JotformSubmission) {
    setSelected(sub);
    setDraft(buildDraft(sub));
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
              </div>
              <Button
                size="sm"
                onClick={() => openReview(s)}
                disabled={s.already_imported}
              >
                <Download className="h-4 w-4 mr-1" />
                {s.already_imported ? "Imported" : "Review & Import"}
              </Button>
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