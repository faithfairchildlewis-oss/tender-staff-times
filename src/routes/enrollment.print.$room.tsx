import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useChildren } from "@/hooks/use-enrollment";
import { ageYearsMonths, compareOldestFirst, formatFull } from "@/lib/enrollment/mapping";
import { nextTransition, ROOMS, type RoomCode } from "@/lib/enrollment/enrollment-logic";

export const Route = createFileRoute("/enrollment/print/$room")({
  head: () => ({ meta: [{ title: "Roster print — Tender Years of Deale" }, { name: "robots", content: "noindex" }] }),
  component: PrintPage,
});

function PrintPage() {
  const { room: roomParam } = Route.useParams();
  const room = roomParam.replace("-", "/") as RoomCode;
  const { data: children = [], isSuccess } = useChildren();
  const now = new Date();

  // Print only once the roster has loaded — a fixed timer races the query
  // and can print an empty page on slow connections.
  useEffect(() => {
    if (!isSuccess) return;
    const t = setTimeout(() => window.print(), 250);
    return () => clearTimeout(t);
  }, [isSuccess]);

  const roster = useMemo(
    () =>
      children
        .filter((c) => c.room === room && c.status === "Active")
        .sort((a, b) => compareOldestFirst(a, b) || a.name.localeCompare(b.name)),
    [children, room],
  );

  const roomCfg = ROOMS[room] as { classroom?: string } | undefined;

  return (
    <div className="min-h-screen bg-white text-black p-8 print:p-4">
      <header className="border-b-2 border-black pb-2 mb-4">
        <h1 className="text-2xl font-bold">{roomCfg?.classroom ?? room}</h1>
        <p className="text-sm">Weekly Roster — printed {formatFull(now)}</p>
      </header>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-black">
            <th className="text-left p-2">Child</th>
            <th className="text-left p-2">Birthday</th>
            <th className="text-left p-2">Age</th>
            <th className="text-left p-2">Schedule</th>
            <th className="text-left p-2">Next transition</th>
            <th className="text-left p-2">Parent</th>
          </tr>
        </thead>
        <tbody>
          {roster.map((c) => {
            const nt = nextTransition(c, now);
            return (
              <tr key={c.id} className="border-b">
                <td className="p-2 font-medium">{c.name}</td>
                <td className="p-2">{c.dob ?? "—"}</td>
                <td className="p-2">{c.dob ? ageYearsMonths(c.dob, now) : "—"}</td>
                <td className="p-2">{c.schedule}</td>
                <td className="p-2">
                  {nt ? (nt.to === "K" ? `Last day ${formatFull(nt.date)}` : `${formatFull(nt.date)} → ${nt.to}${nt.estimate ? " (est)" : ""}`) : "—"}
                </td>
                <td className="p-2">{c.parent ?? "—"}{c.parentPhone && ` • ${c.parentPhone}`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <footer className="mt-8 text-xs italic border-t pt-2">
        "Like showers on new grass" — Deuteronomy 32:2
      </footer>
    </div>
  );
}