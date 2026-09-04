import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock } from "lucide-react";
import { getTimeClockEntries } from "@/lib/time-clock.functions";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function hoursBetween(a: string, b: string) {
  return (new Date(b).getTime() - new Date(a).getTime()) / 3600000;
}

export function TimesheetsView() {
  const fetchEntries = useServerFn(getTimeClockEntries);
  const { data: entries, isLoading } = useQuery({
    queryKey: ["time_clock_entries"],
    queryFn: () => fetchEntries(),
  });
  const [search, setSearch] = useState("");

  const rows = (entries ?? []).filter(
    (e) =>
      search.trim() === "" ||
      e.staff_name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <section className="bg-card rounded-2xl shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-foreground">Timesheets</h2>
        <span className="text-sm text-muted-foreground">{rows.length} entries</span>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by staff name…"
        className="w-full bg-secondary rounded-xl px-3 py-2 min-h-11 text-sm"
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <Clock className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">No clock entries yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm border-separate border-spacing-y-2 min-w-[520px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Staff</th>
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">Clock In</th>
                <th className="px-3 py-2 font-semibold">Clock Out</th>
                <th className="px-3 py-2 font-semibold text-right">Hours</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="bg-secondary">
                  <td className="px-3 py-3 font-semibold text-foreground rounded-l-xl">
                    {e.staff_name}
                  </td>
                  <td className="px-3 py-3 text-foreground whitespace-nowrap">
                    {fmtDate(e.clock_in)}
                  </td>
                  <td className="px-3 py-3 text-foreground whitespace-nowrap">
                    {fmtTime(e.clock_in)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {e.clock_out ? (
                      <span className="text-foreground">{fmtTime(e.clock_out)}</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold">
                        Still in
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right rounded-r-xl text-foreground">
                    {e.clock_out ? hoursBetween(e.clock_in, e.clock_out).toFixed(2) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
