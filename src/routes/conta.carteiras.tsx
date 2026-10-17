import { createFileRoute } from "@tanstack/react-router";
import { PaginaCarteiras } from "@/features/conta/painel";

export const Route = createFileRoute("/conta/carteiras")({
  head: () => ({ meta: [{ title: "Carteiras — Kurio" }] }),
  component: Pagina,
});

function Pagina() {
  const { usuario } = Route.useRouteContext();
  return <PaginaCarteiras usuarioId={usuario.id} />;
}
