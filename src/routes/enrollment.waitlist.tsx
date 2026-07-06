import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ArrowRightCircle } from "lucide-react";
import { toast } from "sonner";
import { useChildren, useConvertWaitlistToChild, useDeleteWaitlist, useUpsertWaitlist, useWaitlist } from "@/hooks/use-enrollment";
import { ageInMonths, eligibleRoomAtAge, nextTransition, type RoomCode } from "@/lib/enrollment/enrollment-logic";
import { formatFull } from "@/lib/enrollment/mapping";
import type { WaitlistRecord } from "@/lib/enrollment/mapping";

const STATUSES = ["Inquiry", "Touring", "Deposit paid", "Hold – deposit pending", "Enrolled", "Withdrawn"];

export const Route = createFileRoute("/enrollment/waitlist")({
  component: WaitlistPage,
});

function WaitlistPage() {
  const { data: waitlist = [], isLoading } = useWaitlist();
  const { data: children = [] } = useChildren();
  const [editing, setEditing] = useState<WaitlistRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const del = useDeleteWaitlist();
  const convert = useConvertWaitlistToChild();
  const now = new Date();

  const upcomingOpenings = useMemo(() => {
    return children
      .map((c) => nextTransition(c, now))
      .filter((t): t is NonNullable<typeof t> => !!t)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [children, now]);

  const match = (w: WaitlistRecord) => {
    const startDate = new Date(w.desiredStart + "T00:00:00");
    const targetRoom = eligibleRoomAtAge(Math.max(ageInMonths(w.dobOrDueDate, startDate), 0));
    const fit = upcomingOpenings.find((t) => t.from === targetRoom && t.date <= startDate);
    return { targetRoom, fit };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">Waitlist</h2>
          <p className="text-sm text-muted-foreground">Inquiry → Touring → Deposit → Enrolled. Deposit-paid entries hold seats in the Snapshot.</p>
        </div>
        <Button onClick={() => setCreating(true)} className="gap-2"><Plus className="h-4 w-4" /> Add inquiry</Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">DOB / due</th>
              <th className="text-left p-3">Desired start</th>
              <th className="text-left p-3">Eligible</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Match</th>
              <th className="text-left p-3">Parent</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">Loading…</td></tr>
            ) : waitlist.length === 0 ? (
              <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">No waitlist entries</td></tr>
            ) : waitlist.map((w) => {
              const m = match(w);
              return (
                <tr key={w.id}>
                  <td className="p-3 font-medium">{w.name}</td>
                  <td className="p-3">{w.dobOrDueDate}</td>
                  <td className="p-3">{w.desiredStart}</td>
                  <td className="p-3"><Badge variant="secondary">{m.targetRoom}</Badge></td>
                  <td className="p-3"><Badge variant={/deposit/i.test(w.status) ? "default" : "outline"}>{w.status}</Badge></td>
                  <td className="p-3 text-xs">
                    {m.fit ? (
                      <span className="text-emerald-700">Fits: {m.fit.child} leaves {m.fit.from} on {formatFull(m.fit.date)}</span>
                    ) : (
                      <span className="text-muted-foreground">No projected opening ≤ start</span>
                    )}
                  </td>
                  <td className="p-3 text-xs">
                    {w.parent ?? "—"}
                    {w.phone && <div className="text-muted-foreground">{w.phone}</div>}
                  </td>
                  <td className="p-3 flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" title="Convert to enrolled child"
                      onClick={async () => {
                        await convert.mutateAsync({
                          waitlist: w,
                          child: {
                            name: w.name,
                            dob: w.dobOrDueDate,
                            room: m.targetRoom,
                            schedule: /extended/i.test(w.notes ?? "") ? "Extended" : "Standard",
                            status: "Active",
                            parent: w.parent,
                            parent_phone: w.phone,
                            parent_email: w.email,
                            notes: w.notes,
                          },
                        });
                        toast.success(`${w.name} converted to enrolled child`);
                      }}>
                      <ArrowRightCircle className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditing(w)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={async () => {
                      if (!confirm(`Delete ${w.name} from the waitlist?`)) return;
                      await del.mutateAsync(w.id); toast.success("Deleted");
                    }}><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {(editing || creating) && (
        <WaitlistDialog entry={editing} onClose={() => { setEditing(null); setCreating(false); }} />
      )}
    </div>
  );
}

function WaitlistDialog({ entry, onClose }: { entry: WaitlistRecord | null; onClose: () => void }) {
  const upsert = useUpsertWaitlist();
  const [form, setForm] = useState({
    name: entry?.name ?? "",
    dob_or_due_date: entry?.dobOrDueDate ?? "",
    desired_start: entry?.desiredStart ?? "",
    status: entry?.status ?? "Inquiry",
    parent: entry?.parent ?? "",
    phone: entry?.phone ?? "",
    email: entry?.email ?? "",
    date_inquired: entry?.dateInquired ?? new Date().toISOString().slice(0, 10),
    notes: entry?.notes ?? "",
  });
  const save = async () => {
    if (!form.name.trim() || !form.dob_or_due_date || !form.desired_start) {
      toast.error("Name, DOB/due date, and desired start are required");
      return;
    }
    await upsert.mutateAsync({
      id: entry?.id,
      name: form.name.trim(),
      dob_or_due_date: form.dob_or_due_date,
      desired_start: form.desired_start,
      status: form.status,
      parent: form.parent || null,
      phone: form.phone || null,
      email: form.email || null,
      date_inquired: form.date_inquired || null,
      notes: form.notes || null,
    } as never);
    toast.success(entry ? "Updated" : "Added");
    onClose();
  };
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{entry ? `Edit ${entry.name}` : "Add inquiry"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <F label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></F>
          <div className="grid grid-cols-2 gap-3">
            <F label="DOB or due date"><Input type="date" value={form.dob_or_due_date} onChange={(e) => setForm({ ...form, dob_or_due_date: e.target.value })} /></F>
            <F label="Desired start"><Input type="date" value={form.desired_start} onChange={(e) => setForm({ ...form, desired_start: e.target.value })} /></F>
          </div>
          <F label="Status">
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </F>
          <F label="Parent"><Input value={form.parent} onChange={(e) => setForm({ ...form, parent: e.target.value })} /></F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></F>
            <F label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></F>
          </div>
          <F label="Date inquired"><Input type="date" value={form.date_inquired} onChange={(e) => setForm({ ...form, date_inquired: e.target.value })} /></F>
          <F label="Notes"><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></F>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={upsert.isPending}>{upsert.isPending ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}