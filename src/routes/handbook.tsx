import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  HANDBOOK,
  HANDBOOK_SUBTITLE,
  HANDBOOK_TITLE,
  SALARY_TABLE,
  type HandbookSection,
} from "@/data/handbook";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/handbook")({
  head: () => ({
    meta: [
      { title: "Staff Handbook — Tender Years of Deale" },
      {
        name: "description",
        content:
          "Read the Tender Years of Deale LLC Employee Handbook: policies on attendance, pay, benefits, safety, confidentiality and child protection.",
      },
      { property: "og:title", content: "Staff Handbook — Tender Years of Deale" },
      {
        property: "og:description",
        content:
          "Searchable employee handbook for Tender Years of Deale staff: core policies, Maryland policies, and child protection policy.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HandbookPage,
});

/** Renders **bold** and *italic* segments in a line of handbook text. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) {
          return <strong key={i}>{p.slice(2, -2)}</strong>;
        }
        if (p.startsWith("*") && p.endsWith("*") && p.length > 2) {
          return <em key={i}>{p.slice(1, -1)}</em>;
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

function SalaryTable() {
  return (
    <div className="overflow-x-auto my-3 rounded-xl border border-border">
      <table className="w-full text-base border-collapse">
        <thead>
          <tr className="bg-secondary text-secondary-foreground text-left">
            <th className="p-2 font-semibold">Position</th>
            <th className="p-2 font-semibold">Requirements</th>
            <th className="p-2 font-semibold whitespace-nowrap">Starting Pay</th>
          </tr>
        </thead>
        <tbody>
          {SALARY_TABLE.map((r, i) => (
            <tr key={r.position} className={i % 2 ? "bg-muted/50" : undefined}>
              <td className="p-2 align-top font-medium">{r.position}</td>
              <td className="p-2 align-top">{r.requirements}</td>
              <td className="p-2 align-top">{r.pay}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SignatureBlock() {
  const fields = ["Employee Name (print)", "Employee Signature", "Date"];
  return (
    <div className="mt-4 space-y-4">
      {fields.map((f) => (
        <div key={f}>
          <p className="text-sm font-semibold text-foreground">{f}</p>
          <div className="mt-1 h-8 border-b-2 border-dashed border-border" aria-hidden="true" />
        </div>
      ))}
      <p className="text-sm text-muted-foreground italic">
        View only — sign the printed copy provided by the Director.
      </p>
    </div>
  );
}

function SectionBody({ section }: { section: HandbookSection }) {
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];

  const flush = (key: string) => {
    if (bullets.length) {
      blocks.push(
        <ul key={key} className="list-disc pl-6 space-y-1 my-2">
          {bullets.map((b, i) => (
            <li key={i} className="text-base leading-relaxed">
              <RichText text={b} />
            </li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  };

  section.body.forEach((line, idx) => {
    if (line.startsWith("- ")) {
      bullets.push(line.slice(2));
      return;
    }
    flush(`ul-${idx}`);
    if (line === "@table") {
      blocks.push(<SalaryTable key={`t-${idx}`} />);
    } else if (line === "@signature") {
      blocks.push(<SignatureBlock key={`s-${idx}`} />);
    } else {
      blocks.push(
        <p key={`p-${idx}`} className="text-base leading-relaxed my-2">
          <RichText text={line} />
        </p>,
      );
    }
  });
  flush("ul-end");

  return <div className="text-foreground">{blocks}</div>;
}

function HandbookPage() {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return HANDBOOK;
    return HANDBOOK.map((g) => ({
      ...g,
      sections: g.sections.filter((s) =>
        `${s.number ?? ""} ${s.title} ${s.body.join(" ")}`.toLowerCase().includes(q),
      ),
    })).filter((g) => g.sections.length > 0);
  }, [query]);

  const matchCount = groups.reduce((n, g) => n + g.sections.length, 0);

  return (
    <div className="min-h-dvh bg-background pb-12">
      <header className="bg-primary text-primary-foreground px-5 pt-8 pb-7 shadow-md rounded-b-3xl">
        <div className="relative flex items-center min-h-11">
          <Link
            to="/"
            aria-label="Back to home"
            className="inline-flex items-center justify-center min-h-11 w-11 rounded-lg bg-primary-foreground/15"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold leading-none">
            Staff Handbook
          </h1>
        </div>
        <p className="text-sm opacity-95 mt-3 text-center leading-snug">
          {HANDBOOK_TITLE} — {HANDBOOK_SUBTITLE}
        </p>
      </header>

      <main className="px-4 mt-5 max-w-2xl mx-auto">
        <div className="relative">
          <Search
            className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the handbook…"
            aria-label="Search the handbook"
            className="w-full bg-card rounded-2xl border border-border pl-11 pr-4 py-3 min-h-12 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {query.trim() ? (
          <p className="text-sm text-muted-foreground mt-2">
            {matchCount} matching section{matchCount === 1 ? "" : "s"}
          </p>
        ) : null}

        {groups.map((group) => (
          <section key={group.id} className="mt-6">
            <h2 className="text-lg font-bold text-foreground mb-2">{group.title}</h2>
            <div className="bg-card rounded-2xl shadow-sm px-4">
              <Accordion type="multiple" className="w-full">
                {group.sections.map((s) => (
                  <AccordionItem key={s.id} value={s.id}>
                    <AccordionTrigger className="text-base font-semibold text-left">
                      {s.number ? `${s.number} ${s.title}` : s.title}
                    </AccordionTrigger>
                    <AccordionContent>
                      <SectionBody section={s} />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>
        ))}

        {groups.length === 0 ? (
          <p className="text-base text-muted-foreground mt-6 text-center">
            No sections match “{query}”.
          </p>
        ) : null}
      </main>
    </div>
  );
}
