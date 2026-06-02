import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { staffNames } from "@/data/schedule";
import { useCurrentSchedule } from "@/hooks/use-schedule";
import { formatWeekRange } from "@/lib/format-date";
import { getDailyContent } from "@/data/daily-content";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tender Years of Deale — Staff Schedule" },
      { name: "description", content: "Weekly staff schedule for Tender Years of Deale." },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: schedule } = useCurrentSchedule();
  const names = schedule ? staffNames(schedule).sort() : [];
  const phone = "4104744156";
  const smsBody = encodeURIComponent(
    "Hi, I would like to request time off.\nMy name is: \nDate(s) requested: \nReason: "
  );

  const now = new Date();
  const dayOfMonth = now.getDate();
  const { verse, encouragement: subline } = getDailyContent(dayOfMonth);
  return (
    <div className="min-h-dvh bg-background pb-10">
      <header
        className="relative overflow-hidden text-primary-foreground px-5 pt-8 pb-7 shadow-md rounded-b-3xl"
        style={{
          background:
            "linear-gradient(160deg, oklch(0.58 0.09 150) 0%, oklch(0.5 0.08 160) 100%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 6px 10px at 20% 25%, white 60%, transparent 62%), radial-gradient(ellipse 5px 8px at 70% 40%, white 60%, transparent 62%), radial-gradient(ellipse 7px 11px at 45% 75%, white 60%, transparent 62%), radial-gradient(ellipse 4px 7px at 88% 80%, white 60%, transparent 62%), radial-gradient(ellipse 5px 9px at 10% 85%, white 60%, transparent 62%), radial-gradient(ellipse 6px 10px at 60% 15%, white 60%, transparent 62%)",
            backgroundSize: "180px 180px",
          }}
        />
        <div className="relative">
          <h1 className="text-xl font-bold tracking-tight leading-none">
            {schedule?.center ?? "Tender Years of Deale"}
          </h1>
          <p className="text-sm italic mt-2 leading-tight text-[oklch(0.98_0.01_90)]/95">
            Where God's word falls like gentle rain.
          </p>
          <p className="text-xs font-light mt-1 leading-tight text-white/70">
            {greeting}
          </p>
        </div>
      </header>

      <main className="px-4 -mt-6 max-w-md mx-auto">
        <section className="bg-card rounded-2xl shadow-sm p-5">
          <h2 className="text-base font-semibold text-foreground mb-3">Select your name</h2>
          <div className="grid grid-cols-2 gap-3">
            {names.map((n) => (
              <Link
                key={n}
                to="/staff/$name"
                params={{ name: n }}
                aria-label={`View ${n}'s schedule`}
                className="bg-secondary text-secondary-foreground hover:bg-accent active:scale-[0.98] transition text-center font-semibold py-4 min-h-14 flex items-center justify-center rounded-xl text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                {n}
              </Link>
            ))}
          </div>
        </section>

        <a
          href={`sms:+1${phone}?&body=${smsBody}`}
          aria-label="Request time off by texting the director at 410-474-4156"
          className="mt-5 flex items-center gap-3 bg-primary text-primary-foreground rounded-2xl p-5 min-h-16 shadow-sm active:scale-[0.99] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <div className="bg-primary-foreground/15 rounded-xl p-3" aria-hidden="true">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="font-semibold text-base">Request time off</div>
            <div className="text-sm opacity-90">Text the director (410-474-4156)</div>
          </div>
        </a>

        <div className="mt-8 text-center">
          <Link
            to="/schedule"
            className="inline-flex items-center justify-center min-h-11 px-4 text-sm text-muted-foreground underline rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Full schedule (admin)
          </Link>
          <span className="mx-2 text-muted-foreground">·</span>
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