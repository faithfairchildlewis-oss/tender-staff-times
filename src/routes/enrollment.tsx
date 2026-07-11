import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { PageBanner } from "@/components/page-banner";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/enrollment")({
  head: () => ({
    meta: [
      { title: "Enrollment — Tender Years of Deale" },
      { name: "description", content: "Enrollment snapshot, transitions, waitlist and roster projections." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EnrollmentLayout,
});

type Tab = { to: string; label: string; adminOnly?: boolean };
const TABS: Tab[] = [
  { to: "/enrollment",             label: "This Week",   adminOnly: true },
  { to: "/enrollment/ask",         label: "Ask",         adminOnly: true },
  { to: "/enrollment/children",    label: "Children",    adminOnly: true },
  { to: "/enrollment/transitions", label: "Transitions", adminOnly: true },
  { to: "/enrollment/projections", label: "Projections", adminOnly: true },
  { to: "/enrollment/roster",      label: "Roster" },
  { to: "/enrollment/waitlist",    label: "Waitlist",    adminOnly: true },
  { to: "/enrollment/import",      label: "Import",      adminOnly: true },
];

function EnrollmentLayout() {
  const { user, loading } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin(user);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (adminLoading) return;
    // Non-admins are only allowed on /enrollment/roster
    if (!isAdmin && location.pathname !== "/enrollment/roster") {
      toast.info("Only directors can view that page. Showing the Weekly Roster.");
      navigate({ to: "/enrollment/roster", replace: true });
    }
  }, [user, loading, isAdmin, adminLoading, location.pathname, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <PageBanner title="Enrollment" subline="Tender Years of Deale" />
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const visibleTabs = isAdmin ? TABS : TABS.filter((t) => !t.adminOnly);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageBanner title="Enrollment" subline="Tender Years of Deale" />
      <nav className="border-b bg-card">
        <div className="mx-auto max-w-7xl px-4 flex gap-1 overflow-x-auto">
          {visibleTabs.map((t) => {
            const active = location.pathname === t.to;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={cn(
                  "px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t bg-card py-6 text-center">
        <p className="text-sm italic text-muted-foreground">
          "Like showers on new grass, like abundant rain on tender plants."
        </p>
        <p className="text-xs text-muted-foreground mt-1">— Deuteronomy 32:2</p>
      </footer>
    </div>
  );
}