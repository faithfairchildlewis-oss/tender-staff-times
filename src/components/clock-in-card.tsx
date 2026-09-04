import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock, Delete, LogIn, LogOut } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getClockStatus, setStaffPin, clockIn, clockOut } from "@/lib/time-clock.functions";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function elapsed(iso: string, now: number) {
  const ms = Math.max(0, now - new Date(iso).getTime());
  const mins = Math.floor(ms / 60000);
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function ClockInCard({ name }: { name: string }) {
  const qc = useQueryClient();
  const fetchStatus = useServerFn(getClockStatus);
  const createPin = useServerFn(setStaffPin);
  const doClockIn = useServerFn(clockIn);
  const doClockOut = useServerFn(clockOut);

  const { data: status } = useQuery({
    queryKey: ["clock_status", name],
    queryFn: () => fetchStatus({ data: { staff_name: name } }),
  });

  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [stage, setStage] = useState<"pin" | "confirm">("pin");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const clockedIn = status?.clocked_in ?? false;
  const needsPin = status ? !status.pin_set : false;

  function reset() {
    setPin("");
    setConfirmPin("");
    setStage("pin");
    setError(null);
  }

  const current = stage === "confirm" ? confirmPin : pin;
  const setCurrent = stage === "confirm" ? setConfirmPin : setPin;

  function press(d: string) {
    setError(null);
    if (current.length < 4) setCurrent(current + d);
  }
  function back() {
    setError(null);
    setCurrent(current.slice(0, -1));
  }

  async function submit() {
    if (current.length !== 4) return;
    setError(null);
    if (needsPin && stage === "pin") {
      setStage("confirm");
      return;
    }
    if (needsPin && stage === "confirm") {
      if (confirmPin !== pin) {
        setError("PINs didn't match. Let's try again.");
        setStage("pin");
        setPin("");
        setConfirmPin("");
        return;
      }
    }
    setBusy(true);
    try {
      if (needsPin) {
        await createPin({ data: { staff_name: name, pin } });
      }
      if (clockedIn) {
        await doClockOut({ data: { staff_name: name, pin } });
      } else {
        await doClockIn({ data: { staff_name: name, pin } });
      }
      await qc.invalidateQueries({ queryKey: ["clock_status", name] });
      setOpen(false);
      reset();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong. Please try again.";
      setError(msg.replace(/^Error:\s*/, ""));
      setPin("");
      setConfirmPin("");
      setStage("pin");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="bg-card rounded-2xl p-5 shadow-sm mt-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary inline-flex items-center justify-center">
            <Clock className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-foreground">
              {clockedIn ? "Clocked in" : "Not clocked in"}
            </div>
            <div className="text-xs text-muted-foreground">
              {clockedIn && status?.clock_in
                ? `Since ${fmtTime(status.clock_in)} · ${elapsed(status.clock_in, now)}`
                : "Tap below to start your shift"}
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            reset();
            setOpen(true);
          }}
          className={`w-full mt-4 min-h-14 rounded-xl text-base font-semibold inline-flex items-center justify-center gap-2 ${
            clockedIn
              ? "bg-destructive text-destructive-foreground"
              : "bg-primary text-primary-foreground"
          }`}
        >
          {clockedIn ? <LogOut className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
          {clockedIn ? "Clock Out" : "Clock In"}
        </button>
      </div>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {needsPin
                ? stage === "pin"
                  ? "Create your 4-digit PIN"
                  : "Re-enter your PIN"
                : clockedIn
                  ? "Enter PIN to clock out"
                  : "Enter PIN to clock in"}
            </DialogTitle>
            <DialogDescription>
              {needsPin
                ? "Your PIN confirms it's really you clocking in and out. Pick something you'll remember."
                : `Hi ${name} — enter your PIN to confirm.`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-center gap-3 py-2" aria-label="PIN entry">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`w-4 h-4 rounded-full ${
                  i < current.length ? "bg-primary" : "bg-secondary border border-border"
                }`}
              />
            ))}
          </div>

          {error && (
            <p className="text-sm text-destructive text-center px-2">{error}</p>
          )}

          <div className="grid grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <button
                key={d}
                onClick={() => press(d)}
                className="min-h-14 rounded-xl bg-secondary text-foreground text-xl font-semibold"
              >
                {d}
              </button>
            ))}
            <span />
            <button
              onClick={() => press("0")}
              className="min-h-14 rounded-xl bg-secondary text-foreground text-xl font-semibold"
            >
              0
            </button>
            <button
              onClick={back}
              aria-label="Delete"
              className="min-h-14 rounded-xl bg-secondary text-muted-foreground inline-flex items-center justify-center"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={submit}
            disabled={current.length !== 4 || busy}
            className="w-full min-h-12 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-40"
          >
            {busy
              ? "Please wait…"
              : needsPin && stage === "pin"
                ? "Continue"
                : clockedIn
                  ? "Clock Out"
                  : "Clock In"}
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
