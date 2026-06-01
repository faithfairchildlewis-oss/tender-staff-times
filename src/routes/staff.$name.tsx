import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Coffee } from "lucide-react";
import { schedule, blocksForDay, dayHours, weeklyHours } from "@/data/schedule";

export const Route = createFileRoute("/staff/$name")({
  head: ({ params }) => ({
    meta: [{ title: `${params.name} — Schedule` }],
  }),
  beforeLoad: ({ params }) => {
    if (!schedule.staff[params.name]) throw notFound();
  },
  component: StaffPage,
});

function StaffPage() {
  const { name } = Route.useParams();
  const info = schedule.staff[name];
  const hours = weeklyHours(name);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-primary text-primary-foreground px-5 pt-8 pb-10 rounded-b-3xl shadow-md">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-primary-foreground/90 hover:text-primary-foreground mb-3"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </Link>
        <h1 className="text-2xl font-bold">Hello, {name}!</h1>
        <p className="text-base opacity-90 mt-1">Your schedule this week</p>
      </header>

      <main className="px-4 -mt-6 max-w-md mx-auto">
        <div className="bg-primary text-primary-foreground rounded-2xl p-5 shadow-sm text-center">
          <div className="text-4xl font-bold">{hours.toFixed(1)}</div>
          <div className="text-sm opacity-90 mt-1">hours this week</div>
        </div>

        <h2 className="text-base font-semibold text-foreground mt-6 mb-3 px-1">
          Shifts, rooms &amp; lunch
        </h2>

        <div className="space-y-3">
          {schedule.days.map((d) => {
            const blocks = blocksForDay(name, d.day);
            const hrs = dayHours(name, d.day);
            const off = blocks.length === 0;
            const brk = info.daily_breaks?.[d.day];
            return (
              <div key={d.day} className="bg-card rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <div>
                    <div className="font-semibold text-base text-foreground">{d.day}</div>
                    <div className="text-xs text-muted-foreground">{d.date}</div>
                  </div>
                  {off && (
                    <span className="bg-muted text-muted-foreground text-xs font-bold px-3 py-1 rounded-full">
                      OFF
                    </span>
                  )}
                </div>
                {!off && (
                  <div className="divide-y divide-border">
                    {blocks.map((b, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-3">
                        <div className="text-base text-foreground">
                          {b.start} – {b.end}
                        </div>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {b.rooms.map((r) => (
                            <span
                              key={r}
                              className="bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-1 rounded-full"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {hrs >= 6 && (
                      <div className="flex items-center gap-3 px-4 py-3 bg-secondary/50">
                        <Coffee className="w-4 h-4 text-primary" />
                        {info.lunch.type === "fixed" ? (
                          <span className="text-sm text-foreground">
                            {brk?.type === "lunch" ? "Lunch" : "Break"}: {info.lunch.time}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">
                            Check with director
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-card border-t border-border px-6 py-3 flex justify-between max-w-md mx-auto">
        <Link to="/" className="text-sm font-medium text-primary">
          ← All names
        </Link>
        <Link to="/admin" className="text-sm font-medium text-primary">
          Full schedule →
        </Link>
      </nav>
    </div>
  );
}