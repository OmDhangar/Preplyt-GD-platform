import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/sessions/$id")({
  ssr: false,
  component: SessionLayout,
});

function SessionLayout() {
  return <Outlet />;
}
