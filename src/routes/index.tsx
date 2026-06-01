import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { schedule, staffNames } from "@/data/schedule";

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
  const names = staffNames();
  const phone = "4104744156";
  const smsBody = encodeURIComponent(
    "Hi, I would like to request time off.\nMy name is: \nDate(s) requested: \nReason: "
  );
  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="bg-primary text-primary-foreground px-5 pt-10 pb-12 rounded-b-3xl shadow-md">
        <h1 className="text-2xl font-bold tracking-tight">{schedule.center}</h1>
        <p className="text-base opacity-90 mt-1">Week of {schedule.week}</p>
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
                className="bg-secondary text-secondary-foreground hover:bg-accent active:scale-[0.98] transition text-center font-semibold py-4 rounded-xl text-base"
              >
                {n}
              </Link>
            ))}
          </div>
        </section>

        <a
          href={`sms:+1${phone}?&body=${smsBody}`}
          className="mt-5 flex items-center gap-3 bg-primary text-primary-foreground rounded-2xl p-5 shadow-sm active:scale-[0.99] transition"
        >
          <div className="bg-primary-foreground/15 rounded-xl p-3">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="font-semibold text-base">Request time off</div>
            <div className="text-sm opacity-90">Text the director (410-474-4156)</div>
          </div>
        </a>

        <div className="mt-8 text-center">
          <Link to="/admin" className="text-sm text-muted-foreground underline">
            Full schedule (admin)
          </Link>
        </div>
      </main>
    </div>
  );
}