import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/staff/$name")({
  component: StaffPage,
});

function StaffPage() {
  return <Navigate to="/login" replace />;
}
