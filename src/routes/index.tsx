import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { staffNames } from "@/data/schedule";
import { useCurrentSchedule } from "@/hooks/use-schedule";
import { formatWeekRange } from "@/lib/format-date";

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
  const names = schedule ? staffNames(schedule) : [];
  const phone = "4104744156";
  const smsBody = encodeURIComponent(
    "Hi, I would like to request time off.\nMy name is: \nDate(s) requested: \nReason: "
  );

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning, team!" : hour < 17 ? "Good afternoon, team!" : "Good evening, team!";

  const verses = [
    { text: "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.", ref: "Colossians 3:23" },
    { text: "Commit to the Lord whatever you do, and he will establish your plans.", ref: "Proverbs 16:3" },
    { text: "Each of you should use whatever gift you have received to serve others, as faithful stewards of God's grace.", ref: "1 Peter 4:10" },
    { text: "Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.", ref: "Galatians 6:9" },
    { text: "Be completely humble and gentle; be patient, bearing with one another in love.", ref: "Ephesians 4:2" },
    { text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.", ref: "Romans 8:28" },
    { text: "The Lord is my strength and my shield; my heart trusts in him, and he helps me.", ref: "Psalm 28:7" },
    { text: "Do everything in love.", ref: "1 Corinthians 16:14" },
    { text: "Shout for joy to the Lord, all the earth. Serve the Lord with gladness; come before him with joyful songs.", ref: "Psalm 100:1-2" },
    { text: "I can do all this through him who gives me strength.", ref: "Philippians 4:13" },
    { text: "Encourage one another and build each other up.", ref: "1 Thessalonians 5:11" },
    { text: "Above all, love each other deeply, because love covers over a multitude of sins.", ref: "1 Peter 4:8" },
    { text: "Trust in the Lord with all your heart and lean not on your own understanding.", ref: "Proverbs 3:5" },
    { text: "A friend loves at all times, and a brother is born for a time of adversity.", ref: "Proverbs 17:17" },
    { text: "Therefore encourage one another and build each other up, just as in fact you are doing.", ref: "1 Thessalonians 5:11" },
    { text: "She opens her mouth with wisdom, and the teaching of kindness is on her tongue.", ref: "Proverbs 31:26" },
    { text: "For we are God's handiwork, created in Christ Jesus to do good works, which God prepared in advance for us to do.", ref: "Ephesians 2:10" },
    { text: "Let your light shine before others, that they may see your good deeds and glorify your Father in heaven.", ref: "Matthew 5:16" },
    { text: "The fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness, gentleness and self-control.", ref: "Galatians 5:22-23" },
    { text: "My grace is sufficient for you, for my power is made perfect in weakness.", ref: "2 Corinthians 12:9" },
  ];

  const sublines = [
    "Your faithfulness shapes little lives every day.",
    "The seeds you plant today grow into tomorrow's miracles.",
    "Every smile you share is a gift from the heart.",
    "Small acts of love leave the biggest footprints.",
    "You are making a difference, one child at a time.",
    "Patience today becomes courage tomorrow.",
    "Your kindness is the lesson they will never forget.",
    "Teaching love is the greatest curriculum of all.",
    "The light you carry brightens every room you enter.",
    "You are exactly who they need today.",
    "Every hug you give plants hope in a little heart.",
    "Your presence is a safe harbor for growing souls.",
    "In your care, children learn they matter.",
    "Gentle hands and steady hearts change the world.",
    "You turn ordinary moments into lifelong memories.",
    "The work of your hands is written on their hearts.",
    "Your compassion today builds their confidence forever.",
    "Each story read aloud is a door opened wide.",
    "You are a chapter in their story of love.",
    "Rest well tonight — you gave your whole heart today.",
  ];

  const dayIndex = new Date().getDate() % verses.length;
  const verse = verses[dayIndex];
  const subline = sublines[dayIndex];
  return (
    <div className="min-h-dvh bg-background pb-10">
      <header className="bg-primary text-primary-foreground px-5 pt-10 pb-12 rounded-b-3xl shadow-md">
        <h1 className="text-2xl font-bold tracking-tight">{schedule?.center ?? "Tender Years of Deale"}</h1>
        <p className="text-base opacity-90 mt-1">
          Week of {schedule?.start_date ? formatWeekRange(schedule.start_date) : schedule?.week ?? "—"}
        </p>
      </header>

      <main className="px-4 -mt-6 max-w-md mx-auto">
        <section className="bg-card rounded-2xl shadow-sm p-5 mb-4">
          <p className="text-sm font-semibold text-foreground">{greeting}</p>
          <p className="text-sm italic text-muted-foreground mt-1">"{verse.text}"</p>
          <p className="text-xs text-muted-foreground mt-0.5">{verse.ref}</p>
          <p className="text-xs text-muted-foreground mt-1.5">{subline}</p>
        </section>

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