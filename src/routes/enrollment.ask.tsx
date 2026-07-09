import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { useChildren, useWaitlist } from "@/hooks/use-enrollment";
import { checkAvailability } from "@/lib/enrollment/enrollment-logic";
import { CAMP_ENDS, formatFull, formatISO } from "@/lib/enrollment/mapping";

export const Route = createFileRoute("/enrollment/ask")({
  head: () => ({
    meta: [
      { title: "Ask — Enrollment" },
      { name: "description", content: "Check whether there's room to enroll a child by birthday." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AskPage,
});

function AskPage() {
  const { data: children = [], isLoading: cLoad } = useChildren();
  const { data: waitlist = [] } = useWaitlist();
  const [dob, setDob] = useState("");
  const [desiredStart, setDesiredStart] = useState(() => formatISO(new Date()));

  const result = useMemo(() => {
    if (!dob || !desiredStart) return null;
    const startDate = new Date(desiredStart + "T00:00:00");
    return checkAvailability(children, waitlist, dob, startDate, CAMP_ENDS);
  }, [children, waitlist, dob, desiredStart]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">Ask</h2>
        <p className="text-sm text-muted-foreground">Do we have room to enroll a child with this birthday?</p>
      </div>

      <Card>
        <CardContent className="pt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Child's birthday</Label>
            <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Desired start date</Label>
            <Input type="date" value={desiredStart} onChange={(e) => setDesiredStart(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {cLoad && dob && <div className="text-sm text-muted-foreground">Loading roster…</div>}

      {!cLoad && !result && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <HelpCircle className="h-4 w-4" /> Enter a birthday to check.
        </div>
      )}

      {!cLoad && result && (
        <Card className={result.available ? "border-emerald-300" : "border-amber-300"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {result.available ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <XCircle className="h-5 w-5 text-amber-600" />
              )}
              {result.available ? "Yes — there's room" : "Not available now"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <p>
              At {formatFull(new Date(desiredStart + "T00:00:00"))} this child would be{" "}
              <strong>{result.ageAtStartMonths} months old</strong>, eligible for{" "}
              <strong>{result.classroom}</strong> ({result.room})
              {result.gate !== "room" && <> — gated on the <Badge variant="secondary">{result.gate}</Badge> sub-limit</>}.
            </p>

            <div className="grid grid-cols-2 gap-y-1 gap-x-4 sm:grid-cols-4 text-xs">
              <div><div className="text-muted-foreground">Capacity</div><div className="font-semibold text-sm">{result.capacity}</div></div>
              <div><div className="text-muted-foreground">Enrolled</div><div className="font-semibold text-sm">{result.census}</div></div>
              <div><div className="text-muted-foreground">Held by deposit</div><div className="font-semibold text-sm">{result.held}</div></div>
              <div><div className="text-muted-foreground">Open after holds</div><div className="font-semibold text-sm">{result.availableAfterHolds}</div></div>
            </div>

            {!result.available && (
              <div className="border-t pt-3">
                {result.nextOpening ? (
                  <p>
                    Next projected opening: <strong>{formatFull(result.nextOpening.date)}</strong>{" "}
                    ({result.nextOpening.availableAfterHolds} seat{result.nextOpening.availableAfterHolds === 1 ? "" : "s"}).
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    No opening projected in the next year. Consider{" "}
                    <Link to="/enrollment/waitlist" className="underline">adding to the waitlist</Link>.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
