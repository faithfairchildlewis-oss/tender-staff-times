import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { useChildren, useWaitlist } from "@/hooks/use-enrollment";
import { ageInMonths, eligibleRoomAtAge, holdsSeat, roomOnDate, type RoomCode } from "@/lib/enrollment/enrollment-logic";
import { CAMP_ENDS, compareOldestFirst, formatISO, formatShort, mondayOf, ROOM_COLORS, ROOM_ORDER } from "@/lib/enrollment/mapping";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/enrollment/roster")({
  component: RosterPage,
});

function RosterPage() {
  const { data: children = [] } = useChildren();
  const { data: waitlist = [] } = useWaitlist();
  const today = mondayOf(new Date());
  const [startISO, setStartISO] = useState(formatISO(today));
  const [weeks, setWeeks] = useState(53);

  const mondays = useMemo(() => {
    const start = mondayOf(new Date(startISO + "T00:00:00"));
    return Array.from({ length: weeks }, (_, i) => new Date(start.getTime() + i * 7 * 86400000));
  }, [startISO, weeks]);

  const rows = useMemo(() => {
    const kids = children
      .filter((c) => c.status === "Active")
      .map((c) => ({ kind: "child" as const, key: c.id, name: c.name, dob: c.dob, room: c.room, child: c }));
    const wl = waitlist
      .filter((w) => holdsSeat(w.status))
      .map((w) => ({
        kind: "waitlist" as const,
        key: `wl-${w.id}`,
        name: `${w.name} *`,
        dob: w.dobOrDueDate,
        room: eligibleRoomAtAge(Math.max(ageInMonths(w.dobOrDueDate, new Date(w.desiredStart + "T00:00:00")), 0)) as RoomCode,
        waitlist: w,
      }));
    return [...kids, ...wl].sort((a, b) => {
      const ra = ROOM_ORDER.indexOf(a.room);
      const rb = ROOM_ORDER.indexOf(b.room);
      if (ra !== rb) return ra - rb;
      return compareOldestFirst(a, b) || a.name.localeCompare(b.name); // oldest at the top of each room
    });
  }, [children, waitlist]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Weekly Roster</h2>
          <p className="text-sm text-muted-foreground">Each cell shows the room the child occupies that week.</p>
        </div>
        <div className="flex items-end gap-2 flex-wrap">
          <div>
            <Label className="text-xs">Start (Monday)</Label>
            <Input type="date" value={startISO} onChange={(e) => setStartISO(e.target.value)} className="w-40" />
          </div>
          <div>
            <Label className="text-xs">Weeks</Label>
            <Input type="number" min={4} max={104} value={weeks} onChange={(e) => setWeeks(+e.target.value || 12)} className="w-24" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {ROOM_ORDER.map((r) => (
              <Link key={r} to="/enrollment/print/$room" params={{ room: r.replace("/", "-") }}>
                <Button variant="outline" size="sm" className="gap-1"><Printer className="h-3 w-3" /> {r}</Button>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <Legend />

      <Card className="overflow-auto max-h-[70vh]">
        <table className="text-xs border-separate border-spacing-0">
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="sticky left-0 z-30 bg-card border-b border-r px-2 py-2 text-left min-w-[10rem]">Child</th>
              <th className="sticky left-40 z-30 bg-card border-b border-r px-2 py-2 text-left min-w-[6rem]">Birthday</th>
              {mondays.map((m) => (
                <th key={m.toISOString()} className="bg-card border-b px-1 py-2 text-center min-w-[3.5rem] whitespace-nowrap">
                  {formatShort(m)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td className={cn("sticky left-0 z-10 bg-card border-r border-b px-2 py-1 font-medium min-w-[10rem]", row.kind === "waitlist" && "italic text-muted-foreground")}>
                  {row.name}
                </td>
                <td className="sticky left-40 z-10 bg-card border-r border-b px-2 py-1 text-muted-foreground min-w-[6rem]">
                  {row.dob ?? "—"}
                </td>
                {mondays.map((m) => {
                  const room = getRoomForRow(row, m);
                  const style = room ? ROOM_COLORS[room] : null;
                  return (
                    <td key={m.toISOString()} className={cn("border-b text-center px-0 py-0.5 min-w-[3.5rem]", style ? `${style.bg} ${style.text}` : "bg-muted/30")}>
                      {room ?? ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <p className="text-xs text-muted-foreground">* indicates a waitlist deposit — appears from their desired start week.</p>
    </div>
  );
}

function getRoomForRow(row: { kind: "child"; child: import("@/lib/enrollment/mapping").ChildRecord } | { kind: "waitlist"; waitlist: import("@/lib/enrollment/mapping").WaitlistRecord; dob: string }, m: Date): RoomCode | null {
  if (row.kind === "child") return roomOnDate(row.child, m, CAMP_ENDS);
  const start = new Date(row.waitlist.desiredStart + "T00:00:00");
  if (m < start) return null;
  return eligibleRoomAtAge(Math.max(ageInMonths(row.dob, m), 0));
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {ROOM_ORDER.map((r) => (
        <span key={r} className={cn("px-2 py-1 rounded border", ROOM_COLORS[r].bg, ROOM_COLORS[r].text, ROOM_COLORS[r].border)}>
          {r} — {ROOM_COLORS[r].label}
        </span>
      ))}
    </div>
  );
}