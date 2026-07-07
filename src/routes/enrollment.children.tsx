import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, UserMinus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useChildren, useUpsertChild, useWithdrawChild } from "@/hooks/use-enrollment";
import { ageYearsMonths, formatFull, ROOM_ORDER } from "@/lib/enrollment/mapping";
import { nextTransition, weeklyRate, type RoomCode } from "@/lib/enrollment/enrollment-logic";
import type { ChildRecord } from "@/lib/enrollment/mapping";

export const Route = createFileRoute("/enrollment/children")({
  component: ChildrenPage,
});

function ChildrenPage() {
  const { data: children = [], isLoading } = useChildren();
  const [showWithdrawn, setShowWithdrawn] = useState(false);
  const [editing, setEditing] = useState<ChildRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const now = new Date();

  const visible = useMemo(() => {
    const list = showWithdrawn ? children : children.filter((c) => c.status === "Active");
    return [...list].sort((a, b) => {
      const ra = ROOM_ORDER.indexOf(a.room);
      const rb = ROOM_ORDER.indexOf(b.room);
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name);
    });
  }, [children, showWithdrawn]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">Children</h2>
          <p className="text-sm text-muted-foreground">{visible.length} shown • {children.filter(c=>c.status==="Active").length} active total</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowWithdrawn((v) => !v)}>
            {showWithdrawn ? "Hide withdrawn" : "Show withdrawn"}
          </Button>
          <Button onClick={() => setCreating(true)} className="gap-2"><Plus className="h-4 w-4" /> Add child</Button>
        </div>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Birthday</th>
              <th className="text-left p-3">Age</th>
              <th className="text-left p-3">Room</th>
              <th className="text-left p-3">Schedule</th>
              <th className="text-right p-3">Weekly rate</th>
              <th className="text-left p-3">Next transition</th>
              <th className="text-left p-3">Fall plan</th>
              <th className="text-left p-3">Parent</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={10} className="p-4 text-center text-muted-foreground">Loading…</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={10} className="p-4 text-center text-muted-foreground">No children</td></tr>
            ) : visible.map((c) => {
              const rate = weeklyRate(c, now);
              const nt = nextTransition(c, now);
              return (
                <tr key={c.id} className={c.status === "Withdrawn" ? "opacity-50" : ""}>
                  <td className="p-3 font-medium">
                    {c.name}
                    {c.status === "Withdrawn" && <Badge variant="outline" className="ml-2">Withdrawn</Badge>}
                    {!c.dob && <Badge variant="destructive" className="ml-2">DOB?</Badge>}
                  </td>
                  <td className="p-3">{c.dob ?? <span className="text-muted-foreground italic">missing</span>}</td>
                  <td className="p-3">{c.dob ? ageYearsMonths(c.dob, now) : "—"}</td>
                  <td className="p-3"><Badge variant="secondary">{c.room}</Badge></td>
                  <td className="p-3">{c.schedule}</td>
                  <td className="p-3 text-right">{rate != null ? `$${rate}` : "—"}</td>
                  <td className="p-3">
                    {nt ? (
                      <span>
                        {nt.to === "K" ? "K (last day " : "→ "}{formatFull(nt.date)}{nt.to === "K" ? ")" : ""} {nt.to !== "K" ? `→ ${nt.to}` : ""}
                        {nt.estimate && <Badge variant="outline" className="ml-2 text-xs">estimate</Badge>}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="p-3">{c.fallPlan ?? "—"}</td>
                  <td className="p-3 text-xs">
                    {c.parent ?? "—"}
                    {c.parentPhone && <div className="text-muted-foreground">{c.parentPhone}</div>}
                  </td>
                  <td className="p-3 flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(c)}><Pencil className="h-4 w-4" /></Button>
                    <WithdrawButton id={c.id} name={c.name} status={c.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {(editing || creating) && (
        <ChildDialog
          child={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
        />
      )}
    </div>
  );
}

function WithdrawButton({ id, name, status }: { id: string; name: string; status: string }) {
  const withdraw = useWithdrawChild();
  const upsert = useUpsertChild();
  if (status === "Withdrawn") {
    return (
      <Button size="icon" variant="ghost" title="Reactivate"
        onClick={async () => {
          await upsert.mutateAsync({ id, name, status: "Active" } as never);
          toast.success(`${name} reactivated`);
        }}>
        <RotateCcw className="h-4 w-4" />
      </Button>
    );
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost" title="Withdraw"><UserMinus className="h-4 w-4" /></Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Withdraw {name}?</AlertDialogTitle>
          <AlertDialogDescription>Marks the child as Withdrawn. History is preserved and can be reactivated.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={async () => { await withdraw.mutateAsync(id); toast.success(`${name} withdrawn`); }}>
            Withdraw
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ChildDialog({ child, onClose }: { child: ChildRecord | null; onClose: () => void }) {
  const upsert = useUpsertChild();
  const [form, setForm] = useState({
    name: child?.name ?? "",
    dob: child?.dob ?? "",
    room: (child?.room ?? "F") as RoomCode,
    schedule: (child?.schedule ?? "Standard") as "Standard" | "Extended",
    fall_plan: child?.fallPlan ?? "",
    parent: child?.parent ?? "",
    parent_phone: child?.parentPhone ?? "",
    parent_email: child?.parentEmail ?? "",
    notes: child?.notes ?? "",
  });
  const save = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    await upsert.mutateAsync({
      id: child?.id,
      name: form.name.trim(),
      dob: form.dob || null,
      room: form.room,
      schedule: form.schedule,
      status: "Active",
      fall_plan: form.fall_plan || null,
      parent: form.parent || null,
      parent_phone: form.parent_phone || null,
      parent_email: form.parent_email || null,
      notes: form.notes || null,
    } as never);
    toast.success(child ? "Child updated" : "Child added");
    onClose();
  };
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{child ? `Edit ${child.name}` : "Add child"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of birth"><Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></Field>
            <Field label="Room">
              <Select value={form.room} onValueChange={(v) => setForm({ ...form, room: v as RoomCode })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROOM_ORDER.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Schedule">
              <Select value={form.schedule} onValueChange={(v) => setForm({ ...form, schedule: v as "Standard" | "Extended" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Standard">Standard</SelectItem><SelectItem value="Extended">Extended</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label="Fall plan (K-bound)">
              <Select value={form.fall_plan || "none"} onValueChange={(v) => setForm({ ...form, fall_plan: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="SAC">SAC</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="TBD">TBD</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Parent"><Input value={form.parent} onChange={(e) => setForm({ ...form, parent: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Parent phone"><Input value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} /></Field>
            <Field label="Parent email"><Input value={form.parent_email} onChange={(e) => setForm({ ...form, parent_email: e.target.value })} /></Field>
          </div>
          <Field label="Notes"><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={upsert.isPending}>{upsert.isPending ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}