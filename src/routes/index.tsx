import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Tender Years of Deale" }] }),
  component: Index,
});

function Index() {
  return <Navigate to="/login" replace />;
}
