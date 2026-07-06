import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useChildren } from "@/hooks/use-enrollment";
import { nextTransition, ROOMS } from "@/lib/enrollment/enrollment-logic";
import { formatFull } from "@/lib/enrollment/mapping";

export const Route = createFileRoute("/enrollment/transitions")({
  component: TransitionsPage,
});

function TransitionsPage() {
  const { data: children = [], isLoading } = useChildren();
  const now = new Date();

  const transitions = useMemo(() => {
    const list = children
      .map((c) => nextTransition(c, now))
      .filter((t): t is NonNullable<typeof t> => !!t)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    const day = 86400000;
    return {
      d30: list.filter((t) => t.date.getTime() - now.getTime() <= 30 * day && t.date >= now),
      d60: list.filter((t) => {
        const diff = t.date.getTime() - now.getTime();
        return diff > 30 * day && diff <= 60 * day;
      }),
      d90: list.filter((t) => {
        const diff = t.date.getTime() - now.getTime();
        return diff > 60 * day && diff <= 90 * day;
      }),
      later: list.filter((t) => t.date.getTime() - now.getTime() > 90 * day),
      past: list.filter((t) => t.date < now),
    };
  }, [children, now]);

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const Section = ({ title, items }: { title: string; items: typeof transitions.d30 }) => (
    <div>
      <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-2">{title} <span className="text-xs font-normal">({items.length})</span></h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">None</p>
      ) : (
        <ol className="relative border-l-2 border-primary/30 ml-3 space-y-3">
          {items.map((t, i) => (
            <li key={i} className="ml-4">
              <span className="absolute -left-1.5 h-3 w-3 rounded-full bg-primary" />
              <Card className="p-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-medium">{t.child}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.to === "K"
                        ? `Last day of preschool: ${formatFull(t.date)} (kindergarten year begins ${t.date.getFullYear()})`
                        : `Moves ${formatFull(t.date)} from ${ROOMS[t.from].classroom} → ${ROOMS[t.to as keyof typeof ROOMS].classroom}`}
                    </div>
                  </div>
                  {t.estimate && <Badge variant="outline">estimate</Badge>}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Opens 1 seat in <strong>{t.from}</strong>
                  {t.to !== "K" && <> · consumes 1 seat in <strong>{t.to}</strong></>}
                </div>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Transitions</h2>
        <p className="text-sm text-muted-foreground">All upcoming moves, grouped by 30/60/90-day windows.</p>
      </div>
      <Section title="Next 30 days" items={transitions.d30} />
      <Section title="31–60 days" items={transitions.d60} />
      <Section title="61–90 days" items={transitions.d90} />
      <Section title="Beyond 90 days" items={transitions.later} />
      {transitions.past.length > 0 && <Section title="Past due" items={transitions.past} />}
    </div>
  );
}