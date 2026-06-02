import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/schedule")({
  component: SchedulePage,
});

function SchedulePage() {
  return <Navigate to="/login" replace />;
}
