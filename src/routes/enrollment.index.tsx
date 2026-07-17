import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useChildren, useRooms, useWaitlist } from "@/hooks/use-enrollment";
import {
  ageInMonths,
  departsForKInYear,
  distinctSeats,
  eligibleRoomAtAge,
  heldSeats,
  holdsSeat,
  openSeatRate,
  ROOMS,
  sproutsComposition,
  staffRequired,
  weeklyRate,
  type RoomCode,
} from "@/lib/enrollment/enrollment-logic";
import { ageYearsMonths, CAMP_ENDS, compareYoungestFirst, formatFull, ROOM_ORDER } from "@/lib/enrollment/mapping";
import type { ChildRecord, WaitlistRecord } from "@/lib/enrollment/mapping";

export const Route = createFileRoute("/enrollment/")({
  component: SnapshotPage,
});

function SnapshotPage() {
  const { data: children = [], isLoading: cLoad } = useChildren();
  const { data: waitlist = [] } = useWaitlist();
  const { data: rooms = [] } = useRooms();
  const [asOf] = useState<Date>(() => new Date());
  const [expandedRoom, setExpandedRoom] = useState<RoomCode | null>(null);

  const roomsByCode = useMemo(
    () => Object.fromEntries(rooms.map((r) => [r.code, r])),
    [rooms],
  );

  const perRoom = useMemo(() => {
    return ROOM_ORDER.map((code) => {
      const roster = children.filter((c) => c.room === code && c.status === "Active");
      const seats = distinctSeats(roster).length;
      const cap = roomsByCode[code]?.capacity ?? ROOMS[code].capacity;
      const held = heldSeats(waitlist, code);
      const open = Math.max(cap - seats, 0);
      const availableAfterHolds = Math.max(open - held, 0);
      const staff = staffRequired(code, children, asOf);
      const revenue = roster.reduce((sum, c) => sum + (weeklyRate(c, asOf) ?? 0), 0);
      const openValue = open * openSeatRate(code);
      return { code, roster: roster.length, seats, cap, open, held, availableAfterHolds, staff, revenue, openValue };
    });
  }, [children, waitlist, roomsByCode, asOf]);

  const sprouts = useMemo(() => sproutsComposition(children, asOf), [children, asOf]);

  const sacOutlook = useMemo(() => {
    // Only THIS year's K class counts toward the Aug 24 projection. A child
    // whose fall plan was pre-filled but who departs next year isn't part of
    // this fall's SAC census.
    const kYear = CAMP_ENDS.getFullYear();
    const jk = children.filter(
      (c) => c.room === "J/K" && c.status === "Active" && departsForKInYear(c, kYear),
    );
    const groups = { SAC: 0, Inactive: 0, TBD: 0, none: 0 } as Record<string, number>;
    for (const c of jk) {
      const key = c.fallPlan ?? "none";
      groups[key] = (groups[key] ?? 0) + 1;
    }
    const sacWaitlist = waitlist.filter((w) => {
      if (!holdsSeat(w.status)) return false;
      const age = ageInMonths(w.dobOrDueDate, new Date(w.desiredStart + "T00:00:00"));
      return eligibleRoomAtAge(Math.max(age, 0)) === "SAC";
    }).length;
    const currentSac = children.filter((c) => c.room === "SAC" && c.status === "Active").length;
    const sacCap = roomsByCode.SAC?.capacity ?? ROOMS.SAC.capacity;
    const projected = currentSac + (groups.SAC ?? 0) + sacWaitlist;
    return { groups, sacWaitlist, currentSac, sacCap, projected };
  }, [children, waitlist, roomsByCode]);

  const flags = useMemo(() => {
    const missing = children.filter((c) => c.status === "Active" && !c.dob);
    const placement = children.filter((c) => {
      if (!c.dob || c.status !== "Active") return false;
      if (c.room === "SAC" || c.room === "SUMMER") return false;
      const eligible = eligibleRoomAtAge(ageInMonths(c.dob, asOf));
      return eligible !== c.room;
    });
    return { missing, placement };
  }, [children, asOf]);

  const copySnapshot = async () => {
    const lines: string[] = [];
    lines.push(`Monday Enrollment Snapshot — ${formatFull(asOf)}`);
    lines.push("");
    lines.push("CENSUS BY ROOM");
    for (const r of perRoom) {
      const cls = ROOMS[r.code as RoomCode].classroom;
      const seatLine = r.roster !== r.seats ? `${r.seats}/${r.cap} seats (${r.roster} children)` : `${r.seats}/${r.cap}`;
      lines.push(`  ${cls} (${r.code}): ${seatLine} — ${r.open} open, ${r.held} held → ${r.availableAfterHolds} available. Staff req: ${r.staff}. $${r.revenue}/wk`);
    }
    lines.push("");
    lines.push(`SPROUTS COMPOSITION: ${sprouts.under2}/3 under-2, ${sprouts.twos}/6 twos`);
    lines.push("");
    lines.push(`FALL SAC OUTLOOK: ${sacOutlook.projected}/${sacOutlook.sacCap} projected`);
    lines.push(`  Current SAC: ${sacOutlook.currentSac}. Fall plans in Oaks: SAC=${sacOutlook.groups.SAC ?? 0}, Inactive=${sacOutlook.groups.Inactive ?? 0}, TBD=${sacOutlook.groups.TBD ?? 0}, unspecified=${sacOutlook.groups.none ?? 0}. Waitlist deposits SAC-eligible: ${sacOutlook.sacWaitlist}`);
    lines.push("");
    if (flags.missing.length || flags.placement.length) {
      lines.push("DATA FLAGS");
      for (const c of flags.missing) lines.push(`  • ${c.name}: DOB missing — update in Brightwheel`);
      for (const c of flags.placement) lines.push(`  • ${c.name} in ${c.room}: placement differs from age-eligible room — director's call`);
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("This Week at a Glance copied to clipboard");
    } catch {
      toast.error("Copy failed — clipboard access denied");
    }
  };

  if (cLoad) return <div className="text-sm text-muted-foreground">Loading snapshot…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">This Week at a Glance</h2>
          <p className="text-sm text-muted-foreground">{formatFull(asOf)}</p>
        </div>
        <Button onClick={copySnapshot} className="gap-2">
          <Copy className="h-4 w-4" /> Copy This Week at a Glance
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {perRoom.map((r) => {
          const cls = ROOMS[r.code as RoomCode].classroom;
          return (
            <Card key={r.code} className="border-l-4" style={{ borderLeftColor: "hsl(var(--primary))" }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <button
                    type="button"
                    className="flex items-center gap-1 hover:underline text-left"
                    onClick={() => setExpandedRoom(expandedRoom === r.code ? null : (r.code as RoomCode))}
                    aria-expanded={expandedRoom === r.code}
                    title="Show the children counted in this census"
                  >
                    {expandedRoom === r.code ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-bold">Room {r.code}</span>
                    <span className="text-xs font-normal text-muted-foreground ml-1">· {cls}</span>
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Seats / Capacity</span>
                  <span className="font-semibold">
                    {r.seats} / {r.cap}
                    {r.roster !== r.seats && (
                      <span className="text-xs font-normal text-muted-foreground ml-1">({r.roster} children)</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between"><span>Open seats</span><span>{r.open}</span></div>
                <div className="flex justify-between"><span>Held by deposit</span><span>{r.held}</span></div>
                <div className="flex justify-between font-medium"><span>Available after holds</span><span>{r.availableAfterHolds}</span></div>
                <div className="flex justify-between"><span>Staff required</span><span>{r.staff}{r.code === "G/H" && <span className="text-xs text-muted-foreground ml-1">(1:3 + 1:6)</span>}</span></div>
                <div className="border-t pt-1 mt-2 flex justify-between"><span>Weekly revenue</span><span className="font-semibold">${r.revenue.toLocaleString()}</span></div>
                <div className="flex justify-between text-muted-foreground text-xs"><span>Open-seat value</span><span>${r.openValue.toLocaleString()}/wk</span></div>
                {expandedRoom === r.code && (
                  <RoomRosterList code={r.code as RoomCode} children={children} waitlist={waitlist} asOf={asOf} open={r.open} />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Sprouts (G/H) composition</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div>
              <div className="flex justify-between"><span>Under-2 seats</span><span>{sprouts.under2} / 3</span></div>
              <div className="h-2 bg-muted rounded mt-1 overflow-hidden"><div className="h-full bg-primary" style={{ width: `${Math.min(100, (sprouts.under2 / 3) * 100)}%` }} /></div>
            </div>
            <div>
              <div className="flex justify-between"><span>Two-year-old seats</span><span>{sprouts.twos} / 6</span></div>
              <div className="h-2 bg-muted rounded mt-1 overflow-hidden"><div className="h-full bg-primary" style={{ width: `${Math.min(100, (sprouts.twos / 6) * 100)}%` }} /></div>
            </div>
            <p className="text-xs text-muted-foreground pt-1">Hard limit: 3 under-2 (1:3) + 6 twos (1:6). Children roll to a two-year-old seat on their 2nd birthday.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Fall SAC outlook</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between"><span>Projected SAC census (Aug 24)</span><span className="font-semibold">{sacOutlook.projected} / {sacOutlook.sacCap}</span></div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div>Current SAC: {sacOutlook.currentSac}</div>
              <div>Oaks children going to SAC: {sacOutlook.groups.SAC ?? 0}</div>
              <div>Oaks children marked Inactive: {sacOutlook.groups.Inactive ?? 0}</div>
              <div>Oaks children TBD: {sacOutlook.groups.TBD ?? 0}</div>
              <div>Oaks children with no fall plan: {sacOutlook.groups.none ?? 0}</div>
              <div>Waitlist deposits SAC-eligible: {sacOutlook.sacWaitlist}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {(flags.missing.length > 0 || flags.placement.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Data flags
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {flags.missing.length > 0 && (
              <div>
                <div className="font-medium mb-1">DOB missing</div>
                <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                  {flags.missing.map((c) => <li key={c.id}>{c.name} — update in Brightwheel</li>)}
                </ul>
              </div>
            )}
            {flags.placement.length > 0 && (
              <div>
                <div className="font-medium mb-1">Placement differs from age-eligible room <Badge variant="secondary" className="ml-1">director's call</Badge></div>
                <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                  {flags.placement.map((c) => {
                    const eligible = eligibleRoomAtAge(ageInMonths(c.dob!, asOf));
                    return <li key={c.id}>{c.name}: in {c.room}, age-eligible for {eligible}</li>;
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RoomRosterList({ code, children, waitlist, asOf, open }: {
  code: RoomCode;
  children: ChildRecord[];
  waitlist: WaitlistRecord[];
  asOf: Date;
  open: number;
}) {
  const roster = children
    .filter((c) => c.room === code && c.status === "Active")
    .sort((a, b) => compareYoungestFirst(a, b) || a.name.localeCompare(b.name));
  // Group shared-seat kids into a single line.
  type RosterItem =
    | { kind: "solo"; child: ChildRecord }
    | { kind: "pair"; group: string; children: ChildRecord[] };
  const groupMap = new Map<string, ChildRecord[]>();
  const items: RosterItem[] = [];
  for (const c of roster) {
    if (!c.shareSeatGroup) {
      items.push({ kind: "solo", child: c });
    } else {
      const arr = groupMap.get(c.shareSeatGroup) ?? [];
      arr.push(c);
      groupMap.set(c.shareSeatGroup, arr);
      if (arr.length === 1) items.push({ kind: "pair", group: c.shareSeatGroup, children: arr });
    }
  }
  const holds = waitlist
    .filter((w) => {
      if (!holdsSeat(w.status)) return false;
      const age = ageInMonths(w.dobOrDueDate, new Date(w.desiredStart + "T00:00:00"));
      return eligibleRoomAtAge(Math.max(age, 0)) === code;
    })
    .sort((a, b) => a.desiredStart.localeCompare(b.desiredStart));
  return (
    <div className="border-t mt-2 pt-2 space-y-1">
      <div className="text-xs font-semibold text-muted-foreground uppercase">
        Enrolled ({roster.length}{roster.length !== items.length && <> · {items.length} seats</>})
      </div>
      {roster.length === 0 ? (
        <div className="text-xs text-muted-foreground italic">No children in this room</div>
      ) : (
        <ul className="space-y-0.5">
          {items.map((it) => {
            if (it.kind === "solo") {
              const c = it.child;
              return (
                <li key={c.id} className="flex justify-between text-xs">
                  <span>{c.name}</span>
                  <span className="text-muted-foreground">{c.dob ? ageYearsMonths(c.dob, asOf) : "DOB?"}</span>
                </li>
              );
            }
            const names = it.children.map((k) => k.name.split(" ")[0]).join(" & ");
            return (
              <li key={it.group} className="flex justify-between text-xs">
                <span>
                  {names}
                  <span className="ml-1 text-[10px] uppercase tracking-wide text-muted-foreground">shared seat</span>
                </span>
                <span className="text-muted-foreground">
                  {it.children.map((k) => (k.dob ? ageYearsMonths(k.dob, asOf) : "DOB?")).join(" / ")}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {holds.length > 0 && (
        <>
          <div className="text-xs font-semibold text-muted-foreground uppercase pt-1">Held by deposit ({holds.length})</div>
          <ul className="space-y-0.5">
            {holds.map((w) => (
              <li key={w.id} className="flex justify-between text-xs italic">
                <span>{w.name}</span>
                <span className="text-muted-foreground">starts {w.desiredStart}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {open > 0 && <div className="text-xs text-muted-foreground pt-1">{open} open seat{open === 1 ? "" : "s"}</div>}
    </div>
  );
}
