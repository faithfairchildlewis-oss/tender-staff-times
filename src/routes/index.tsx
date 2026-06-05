import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquare, Printer } from "lucide-react";
import { staffNames } from "@/data/schedule";
import { useCurrentSchedule } from "@/hooks/use-schedule";
import { getDailyContent } from "@/data/daily-content";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createTimeOffRequest } from "@/lib/time-off.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tender Years of Deale — Staff Schedule" },
      { name: "description", content: "View the official weekly staff schedule, room assignments, and daily encouragement for Tender Years of Deale." },
      { property: "og:title", content: "Tender Years of Deale — Staff Schedule" },
      { property: "og:description", content: "View the official weekly staff schedule, room assignments, and daily encouragement for Tender Years of Deale." },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              name: "Tender Years of Deale Staff Schedule",
              url: "https://staff.tenderyearscenter.com/",
            },
            {
              "@type": "Organization",
              name: "Tender Years of Deale",
              description: "Childcare center in Deale, Maryland.",
              url: "https://staff.tenderyearscenter.com/",
            },
          ],
        }),
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: schedule } = useCurrentSchedule();
  const names = schedule ? staffNames(schedule).sort() : [];

  const now = new Date();
  const dayOfMonth = now.getDate();
  const { verse } = getDailyContent(dayOfMonth);
  return (
    <div className="min-h-dvh bg-background pb-10">
      <header className="bg-primary text-primary-foreground px-5 pt-8 pb-7 shadow-md rounded-b-3xl relative">
        <div className="absolute top-4 right-4">
          <Link
            to="/admin"
            className="text-sm underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            Admin
          </Link>
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-tight leading-none">
            Tender Years of Deale
          </h1>
          <p className="text-sm italic mt-2 leading-tight text-primary-foreground/95">
            Where God's word falls like gentle rain.
          </p>
        </div>

        <section className="bg-lilac-light rounded-2xl shadow-sm p-5 mt-5">
          <p className="text-xs font-semibold text-lilac-foreground uppercase tracking-wide">Verse of the Day</p>
          <p className="text-base italic text-lilac-foreground mt-2 leading-relaxed">"{verse.text}"</p>
          <p className="text-xs text-lilac-foreground mt-2 opacity-70">{verse.ref}</p>
        </section>
      </header>

      <main className="px-4 mt-5 max-w-md mx-auto">
        <section className="bg-card rounded-2xl shadow-sm p-5">
          <h2 className="text-base font-semibold text-foreground mb-3">Select your name</h2>
          <div className="grid grid-cols-3 gap-3">
            {names.map((n) => (
              <Link
                key={n}
                to="/staff/$name"
                params={{ name: n }}
                aria-label={`View ${n}'s schedule`}
                className="bg-secondary text-secondary-foreground hover:bg-accent active:scale-[0.98] transition text-center font-semibold py-2 min-h-10 flex items-center justify-center rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                {n}
              </Link>
            ))}
          </div>
        </section>

        <TimeOffRequestButton names={names} />

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            to="/print/staff"
            aria-label="Open printable staff schedule"
            className="flex items-center gap-3 bg-primary text-primary-foreground rounded-2xl p-4 min-h-14 shadow-sm active:scale-[0.99] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <div className="bg-primary-foreground/15 rounded-xl p-2.5" aria-hidden="true">
              <Printer className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm leading-tight">Print Staff Schedule</div>
              <div className="text-xs opacity-90 mt-0.5">Weekly hours table</div>
            </div>
          </Link>
          <Link
            to="/print/rooms"
            aria-label="Open printable room view"
            className="flex items-center gap-3 bg-primary text-primary-foreground rounded-2xl p-4 min-h-14 shadow-sm active:scale-[0.99] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <div className="bg-primary-foreground/15 rounded-xl p-2.5" aria-hidden="true">
              <Printer className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm leading-tight">Print Room View</div>
              <div className="text-xs opacity-90 mt-0.5">Daily room assignments</div>
            </div>
          </Link>
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/admin"
            className="inline-flex items-center justify-center min-h-11 px-4 text-sm text-muted-foreground underline rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Admin
          </Link>
        </div>
      </main>
    </div>
  );
}

function TimeOffRequestButton({ names }: { names: string[] }) {
  const [open, setOpen] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [dateRequested, setDateRequested] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = useServerFn(createTimeOffRequest);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!staffName.trim() || !dateRequested.trim() || !reason.trim()) return;
    setSubmitting(true);
    try {
      await submit({ data: { staff_name: staffName.trim(), date_requested: dateRequested.trim(), reason: reason.trim() } });
      toast.success("Time-off request submitted");
      setStaffName("");
      setDateRequested("");
      setReason("");
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Could not submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Request time off"
          className="mt-5 w-full flex items-center gap-3 bg-primary text-primary-foreground rounded-2xl p-5 min-h-16 shadow-sm active:scale-[0.99] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background text-left"
        >
          <div className="bg-primary-foreground/15 rounded-xl p-3" aria-hidden="true">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-base">Request Time Off</div>
            <div className="text-sm opacity-90">
              Sent to Michelle & Pastor Faith for approval
            </div>
          </div>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Time Off</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="to-name" className="text-sm font-medium text-foreground">Your name</label>
            {names.length > 0 ? (
              <select
                id="to-name"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                required
                className="w-full bg-secondary rounded-xl px-3 py-2 min-h-11 text-sm"
              >
                <option value="">Select your name…</option>
                {names.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            ) : (
              <input
                id="to-name"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                required
                maxLength={100}
                className="w-full bg-secondary rounded-xl px-3 py-2 min-h-11 text-sm"
              />
            )}
          </div>
          <div className="space-y-1">
            <label htmlFor="to-date" className="text-sm font-medium text-foreground">Date(s) requested</label>
            <input
              id="to-date"
              value={dateRequested}
              onChange={(e) => setDateRequested(e.target.value)}
              required
              maxLength={200}
              placeholder="e.g. July 14–16, 2026"
              className="w-full bg-secondary rounded-xl px-3 py-2 min-h-11 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="to-reason" className="text-sm font-medium text-foreground">Reason</label>
            <textarea
              id="to-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              maxLength={1000}
              rows={3}
              className="w-full bg-secondary rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <DialogFooter>
            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-11 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit Request"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
