import { createFileRoute, Outlet } from "@tanstack/react-router";
import { exigirSessao } from "@/shared/guarda";

export const Route = createFileRoute("/conta")({
  beforeLoad: ({ context, location }) => exigirSessao(context.queryClient, location.href),
  component: () => <Outlet />,
});
