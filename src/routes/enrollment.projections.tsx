import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { useChildren, useRooms, useWaitlist } from "@/hooks/use-enrollment";
import { projectWeekly, ROOMS, type RoomCode } from "@/lib/enrollment/enrollment-logic";
import { CAMP_ENDS, ROOM_COLORS, ROOM_ORDER, formatShort, mondayOf } from "@/lib/enrollment/mapping";

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
  const projection = useMemo(
    () => projectWeekly(children, waitlist, startMonday, weeks, CAMP_ENDS),
    [children, waitlist, startMonday, weeks],
  );

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

      {/* Mobile: one card per week, rooms stacked. */}
      <div className="space-y-3 md:hidden">
        {projection.map(({ week, census }) => (
          <Card key={week.toISOString()} className="p-4">
            <div className="flex items-baseline justify-between mb-3">
              <div className="font-semibold">Week of {formatShort(week)}</div>
              <div className="text-xs text-muted-foreground">
                {ROOM_ORDER.reduce((n, r) => n + census[r], 0)} total
              </div>
            </div>
            <ul className="space-y-2">
              {ROOM_ORDER.map((code) => {
                const cap = capacityByRoom[code];
                const count = census[code];
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
                    <div className="h-1.5 rounded bg-muted overflow-hidden">
                      <div
                        className={over ? "h-full bg-destructive" : "h-full bg-primary"}
                        style={{ width: `${over ? 100 : pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>

      {/* Desktop: matrix table. */}
      <Card className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">Week of</th>
              {ROOM_ORDER.map((code) => (
                <th key={code} className="text-left p-3">
                  {code}
                  <span className="ml-1 text-muted-foreground normal-case font-normal">
                    / {capacityByRoom[code]}
                  </span>
                </th>
              ))}
              <th className="text-left p-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {projection.map(({ week, census }) => {
              const total = ROOM_ORDER.reduce((n, r) => n + census[r], 0);
              return (
                <tr key={week.toISOString()} className="border-t">
                  <td className="p-3 font-medium whitespace-nowrap">{formatShort(week)}</td>
                  {ROOM_ORDER.map((code) => {
                    const cap = capacityByRoom[code];
                    const count = census[code];
                    const over = count > cap;
                    return (
                      <td key={code} className={`p-3 font-mono tabular-nums ${over ? "text-destructive font-semibold" : ""}`}>
                        {count}
                        {over && <AlertTriangle className="inline h-3.5 w-3.5 ml-1 -mt-0.5" />}
                      </td>
                    );
                  })}
                  <td className="p-3 font-mono tabular-nums text-muted-foreground">{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <p className="text-xs text-muted-foreground">
        Move-ups whose eligibility date has already passed stay in the child's current room —
        the Snapshot flags those separately. Only deposit-held waitlist entries are counted.
      </p>
    </div>
  );
}