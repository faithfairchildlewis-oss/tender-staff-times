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
    { text: "Let your light shine before others, that they may see your good deeds and glorify your Father in heaven.", ref: "Matthew 5:16" },
    { text: "Start children off on the way they should go, and even when they are old they will not turn from it.", ref: "Proverbs 22:6" },
    { text: "Children are a heritage from the Lord, offspring a reward from him.", ref: "Psalm 127:3" },
    { text: "I can do all this through him who gives me strength.", ref: "Philippians 4:13" },
    { text: "Trust in the Lord with all your heart and lean not on your own understanding.", ref: "Proverbs 3:5-6" },
    { text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.", ref: "Joshua 1:9" },
    { text: "She is clothed with strength and dignity; she can laugh at the days to come.", ref: "Proverbs 31:25" },
    { text: "The Lord is my shepherd, I lack nothing.", ref: "Psalm 23:1" },
    { text: "Love is patient, love is kind. It does not envy, it does not boast, it is not proud.", ref: "1 Corinthians 13:4" },
    { text: "And we know that in all things God works for the good of those who love him.", ref: "Romans 8:28" },
    { text: "Do not grow weary in doing good, for at the proper time we will reap a harvest if we do not give up.", ref: "Galatians 6:9" },
    { text: "The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you.", ref: "Numbers 6:24-25" },
    { text: "Even a child is known by their actions, by whether their conduct is pure and upright.", ref: "Proverbs 20:11" },
    { text: "Jesus said, 'Let the little children come to me, and do not hinder them, for the kingdom of heaven belongs to such as these.'", ref: "Matthew 19:14" },
    { text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles.", ref: "Isaiah 40:31" },
    { text: "This is the day the Lord has made; we will rejoice and be glad in it.", ref: "Psalm 118:24" },
    { text: "Your word is a lamp for my feet, a light on my path.", ref: "Psalm 119:105" },
    { text: "The fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness, gentleness and self-control.", ref: "Galatians 5:22-23" },
    { text: "Be kind and compassionate to one another, forgiving each other, just as in Christ God forgave you.", ref: "Ephesians 4:32" },
    { text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.", ref: "Jeremiah 29:11" },
    { text: "Blessed are the pure in heart, for they will see God.", ref: "Matthew 5:8" },
    { text: "A cheerful heart is good medicine.", ref: "Proverbs 17:22" },
    { text: "Let everything you do be done in love.", ref: "1 Corinthians 16:14" },
    { text: "Serve one another humbly in love.", ref: "Galatians 5:13" },
    { text: "Cast all your anxiety on him because he cares for you.", ref: "1 Peter 5:7" },
    { text: "Give thanks to the Lord, for he is good; his love endures forever.", ref: "Psalm 107:1" },
    { text: "The steadfast love of the Lord never ceases; his mercies never come to an end. They are new every morning.", ref: "Lamentations 3:22-23" },
    { text: "Whoever welcomes one of these little children in my name welcomes me.", ref: "Mark 9:37" },
    { text: "May the God of hope fill you with all joy and peace as you trust in him.", ref: "Romans 15:13" },
  ];

  const encouragements = [
    "You are here. Jesus is counting on you today.",
    "The seeds you plant today will bloom for a lifetime.",
    "You are doing holy work — don't forget that.",
    "Little eyes are watching and learning from you. Be All in.",
    "Your kindness is never wasted here.",
    "God placed you here for a reason. Have you prayed for your children today?",
    "What makes us different? We strive toward harmony. Hold fast today.",
    "Behind every thriving child here is a teacher who showed up ready to have a great day.",
    "Remember we don't know what stressors go on before they arrived. But now they are here. Show grace.",
    "Spark the joy of the children today. Laugh with them. Share joy.",
    "These children are blessed to have adults who seek His grace.",
    "Small moments in a classroom become big memories for a child.",
    "You are making an eternal difference.",
    "Your patience is a gift these children will carry with them.",
    "Showing up faithfully is an act of worship.",
    "You are living out your calling today.",
    "The love you give here echoes far beyond these walls.",
    "Every child who knows your name is richer for it.",
    "You were made for this kind of work.",
    "Grace and strength go with you today.",
    "What looks ordinary to the world is extraordinary to God.",
    "Your smile sets the tone for someone's whole morning.",
    "Thank you for pouring yourself into this mission.",
    "You are not just watching children — you are shaping them.",
    "This is more than a job. It's a calling. You're living it.",
    "Rest in knowing God sees every quiet act of care you give.",
    "Today is a new gift — and so are you to this team.",
    "You are a steady anchor for little hearts.",
    "The Lord goes before you into every room today.",
    "Your presence here is a blessing, not an accident.",
    "Little moments of love add up to a child's whole world.",
    "You are seen, you are valued, you are appreciated.",
    "Walk in confidence today — you were called here.",
  ];

  const dayIndex = new Date().getDate() % verses.length;
  const verse = verses[dayIndex];
  const subline = encouragements[dayIndex % encouragements.length];
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