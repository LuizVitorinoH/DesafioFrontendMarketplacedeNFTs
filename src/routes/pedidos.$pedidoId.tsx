import { createFileRoute } from "@tanstack/react-router";
import { PaginaPedido } from "@/features/pedido/pagina";
import { exigirSessao } from "@/shared/guarda";

export const Route = createFileRoute("/pedidos/$pedidoId")({
  head: () => ({ meta: [{ title: "Pedido — Kurio" }] }),
  beforeLoad: ({ context, location }) => exigirSessao(context.queryClient, location.href),
  component: Pagina,
});

function Pagina() {
  const { pedidoId } = Route.useParams();
  return <PaginaPedido pedidoId={pedidoId} />;
}
