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
  const phone = "4104744156";
  const smsBody = encodeURIComponent(
    "Hi, I would like to request time off.\nMy name is: \nDate(s) requested: \nReason: "
  );

  const now = new Date();
  const dayOfMonth = now.getDate();
  const { verse, encouragement: subline } = getDailyContent(dayOfMonth);
  return (
    <div className="min-h-dvh bg-background pb-10">
      <header className="bg-primary text-primary-foreground px-5 pt-8 pb-7 shadow-md rounded-b-3xl">
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-tight leading-none">
            {schedule?.center ? `${schedule.center} Staff Schedule` : "Tender Years of Deale Staff Schedule"}
          </h1>
          <p className="text-sm italic mt-2 leading-tight text-primary-foreground/95">
            Where God's word falls like gentle rain.
          </p>
        </div>
      </header>

      <main className="px-4 -mt-6 max-w-md mx-auto">
        <section className="bg-lilac-light rounded-2xl shadow-sm p-5">
          <p className="text-xs font-semibold text-lilac-foreground uppercase tracking-wide">Verse of the Day</p>
          <p className="text-base italic text-lilac-foreground mt-2 leading-relaxed">"{verse.text}"</p>
          <p className="text-xs text-lilac-foreground mt-2 opacity-70">{verse.ref}</p>
        </section>

        <section className="bg-card rounded-2xl shadow-sm p-5 mt-5">
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
          <div className="min-w-0">
            <div className="font-semibold text-base">Request time off</div>
            <div className="text-sm opacity-90">
              Text the director{" "}
              <span className="whitespace-nowrap">(410-474-4156)</span>
            </div>
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