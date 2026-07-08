import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { useChildren, useRooms, useWaitlist } from "@/hooks/use-enrollment";
import {
  ageInMonths,
  eligibleRoomAtAge,
  holdsSeat,
  roomOnDate,
  ROOMS,
  type RoomCode,
} from "@/lib/enrollment/enrollment-logic";
import {
  CAMP_ENDS,
  ROOM_COLORS,
  ROOM_ORDER,
  compareOldestFirst,
  formatShort,
  mondayOf,
} from "@/lib/enrollment/mapping";

export const Route = createFileRoute("/enrollment/projections")({
  head: () => ({
    meta: [
      { title: "Weekly Projections — Enrollment" },
      { name: "description", content: "Projected weekly census by room for the coming weeks." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProjectionsPage,
});

const WEEK_OPTIONS = [4, 8, 12] as const;

function ProjectionsPage() {
  const { data: children = [], isLoading } = useChildren();
  const { data: waitlist = [] } = useWaitlist();
  const { data: rooms = [] } = useRooms();
  const [weeks, setWeeks] = useState<number>(8);

  const capacityByRoom = useMemo(() => {
    const map: Record<RoomCode, number> = {
      F: ROOMS.F.capacity,
      I: ROOMS.I.capacity,
      "G/H": ROOMS["G/H"].capacity,
      "J/K": ROOMS["J/K"].capacity,
      SAC: ROOMS.SAC.capacity,
      SUMMER: ROOMS.SUMMER.capacity,
    };
    for (const r of rooms) {
      if (r.code in map) map[r.code as RoomCode] = r.capacity;
    }
    return map;
  }, [rooms]);

  const startMonday = useMemo(() => mondayOf(new Date()), []);
  // Per-week occupancy: for each room, the list of children (real + held
  // waitlist seats) sorted oldest → youngest by DOB.
  const projection = useMemo(() => {
    type Occupant = { key: string; name: string; dob: string | null; held?: boolean };
    const emptyRooms = (): Record<RoomCode, Occupant[]> => ({
      F: [], I: [], "G/H": [], "J/K": [], SAC: [], SUMMER: [],
    });
    const heldWL = waitlist.filter((w) => holdsSeat(w.status));
    const out: { week: Date; rooms: Record<RoomCode, Occupant[]> }[] = [];
    for (let w = 0; w < weeks; w++) {
      const wk = new Date(startMonday.getTime() + w * 7 * 86400000);
      const rooms = emptyRooms();
      for (const c of children) {
        if (c.status !== "Active") continue;
        const room = roomOnDate(c, wk, CAMP_ENDS, startMonday);
        if (room) rooms[room].push({ key: `c-${c.id}`, name: c.name, dob: c.dob });
      }
      for (const wl of heldWL) {
        const start = new Date(wl.desiredStart + "T00:00:00");
        if (wk < start) continue;
        const age = ageInMonths(wl.dobOrDueDate, wk);
        const room = eligibleRoomAtAge(Math.max(age, 0));
        rooms[room].push({ key: `w-${wl.id}`, name: wl.name, dob: wl.dobOrDueDate, held: true });
      }
      for (const code of ROOM_ORDER) {
        rooms[code].sort((a, b) => compareOldestFirst(a, b) || a.name.localeCompare(b.name));
      }
      out.push({ week: wk, rooms });
    }
    return out;
  }, [children, waitlist, startMonday, weeks]);

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading projections…</div>;
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-2xl font-bold">Weekly Projections</h2>
        <p className="text-sm text-muted-foreground">
          Projected census by room, week by week. Includes upcoming move-ups,
          the K departure on Aug 21, and deposit-held waitlist starts.
        </p>
      </header>

      <div className="flex items-center gap-2">
        <span className="text-xs uppercase text-muted-foreground">Horizon</span>
        {WEEK_OPTIONS.map((w) => (
          <Button
            key={w}
            size="sm"
            variant={w === weeks ? "default" : "outline"}
            onClick={() => setWeeks(w)}
          >
            {w} wks
          </Button>
        ))}
      </div>

      {/* One card per week; rooms stacked with the child roster listed
          oldest → youngest inside each room. */}
      <div className="grid gap-3 md:grid-cols-2">
        {projection.map(({ week, rooms }) => {
          const total = ROOM_ORDER.reduce((n, r) => n + rooms[r].length, 0);
          return (
            <Card key={week.toISOString()} className="p-4">
              <div className="flex items-baseline justify-between mb-3">
                <div className="font-semibold">Week of {formatShort(week)}</div>
                <div className="text-xs text-muted-foreground">{total} total</div>
              </div>
              <ul className="space-y-3">
                {ROOM_ORDER.map((code) => {
                  const cap = capacityByRoom[code];
                  const list = rooms[code];
                  const count = list.length;
                  const over = count > cap;
                  const pct = cap > 0 ? Math.min((count / cap) * 100, 100) : 0;
                  const c = ROOM_COLORS[code];
                  return (
                    <li key={code}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="outline" className={`${c.bg} ${c.text} ${c.border}`}>
                            {code}
                          </Badge>
                          <span className="truncate text-muted-foreground">{c.label}</span>
                        </div>
                        <div className={`font-mono tabular-nums ${over ? "text-destructive font-semibold" : ""}`}>
                          {count}/{cap}
                          {over && <AlertTriangle className="inline h-3.5 w-3.5 ml-1 -mt-0.5" />}
                        </div>
                      </div>
                      <div className="h-1.5 rounded bg-muted overflow-hidden mb-2">
                        <div
                          className={over ? "h-full bg-destructive" : "h-full bg-primary"}
                          style={{ width: `${over ? 100 : pct}%` }}
                        />
                      </div>
                      {list.length === 0 ? (
                        <div className="text-xs text-muted-foreground italic pl-1">empty</div>
                      ) : (
                        <ol className="text-sm space-y-0.5 pl-1">
                          {list.map((o) => (
                            <li key={o.key} className="flex items-baseline justify-between gap-2">
                              <span className="truncate">
                                {o.name}
                                {o.held && (
                                  <span className="ml-1 text-xs text-muted-foreground">(hold)</span>
                                )}
                              </span>
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {o.dob ?? "—"}
                              </span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Move-ups whose eligibility date has already passed stay in the child's current room —
        the Snapshot flags those separately. Only deposit-held waitlist entries are counted.
      </p>
    </div>
  );
}