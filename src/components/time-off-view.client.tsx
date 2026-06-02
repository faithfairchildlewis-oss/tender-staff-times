import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarX2, Filter } from "lucide-react";
import { getTimeOffRequests, updateTimeOffStatus } from "@/lib/time-off.functions";

export function TimeOffView() {
  const qc = useQueryClient();
  const fetchRequests = useServerFn(getTimeOffRequests);
  const updateStatus = useServerFn(updateTimeOffStatus);
  const { data: requests, isLoading } = useQuery({
    queryKey: ["time_off_requests"],
    queryFn: () => fetchRequests(),
  });
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "denied">("all");
  const [search, setSearch] = useState("");

  const allRequests = requests ?? [];
  const filtered = allRequests.filter((r) => {
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    const matchSearch = search.trim() === "" || r.staff_name.toLowerCase().includes(search.trim().toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts = {
    all: allRequests.length,
    pending: allRequests.filter((r) => r.status === "pending").length,
    approved: allRequests.filter((r) => r.status === "approved").length,
    denied: allRequests.filter((r) => r.status === "denied").length,
  };

  async function handleStatus(id: string, status: "pending" | "approved" | "denied") {
    await updateStatus({ data: { id, status } });
    await qc.invalidateQueries({ queryKey: ["time_off_requests"] });
  }

  function statusBadge(status: string) {
    if (status === "approved")
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-teal text-teal-foreground text-xs font-semibold">Approved</span>;
    if (status === "denied")
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold">Denied</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold">Pending</span>;
  }

  return (
    <section className="bg-card rounded-2xl shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-foreground">Time-Off Requests</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="w-4 h-4" />
          <span>{filtered.length} shown</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by staff name…"
          className="w-full bg-secondary rounded-xl px-3 py-2 min-h-11 text-sm"
        />
        <div className="flex gap-1 bg-secondary rounded-xl p-1">
          {(["all", "pending", "approved", "denied"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`flex-1 text-xs font-semibold min-h-9 rounded-lg capitalize ${
                filterStatus === s ? "bg-card text-foreground shadow" : "text-muted-foreground"
              }`}
            >
              {s} ({counts[s]})
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <CalendarX2 className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">
            {requests?.length ? "No requests match your filters." : "No time-off requests yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="bg-secondary rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-foreground text-base">{r.staff_name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Submitted {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
                {statusBadge(r.status)}
              </div>
              <div className="text-sm text-foreground">
                <span className="text-muted-foreground">Date(s) requested:</span>{" "}
                {r.date_requested}
              </div>
              <div className="text-sm text-foreground">
                <span className="text-muted-foreground">Reason:</span>{" "}
                {r.reason}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleStatus(r.id, "approved")}
                  disabled={r.status === "approved"}
                  className="flex-1 min-h-9 rounded-lg text-xs font-semibold bg-teal text-teal-foreground disabled:opacity-40"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleStatus(r.id, "denied")}
                  disabled={r.status === "denied"}
                  className="flex-1 min-h-9 rounded-lg text-xs font-semibold bg-destructive text-destructive-foreground disabled:opacity-40"
                >
                  Deny
                </button>
                <button
                  onClick={() => handleStatus(r.id, "pending")}
                  disabled={r.status === "pending"}
                  className="flex-1 min-h-9 rounded-lg text-xs font-semibold bg-accent text-accent-foreground disabled:opacity-40"
                >
                  Reset
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}