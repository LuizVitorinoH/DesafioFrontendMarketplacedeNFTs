import { createFileRoute } from "@tanstack/react-router";
import { PaginaPagamento } from "@/features/pagamento/pagina";
import { exigirSessao } from "@/shared/guarda";

export const Route = createFileRoute("/pagamento")({
  head: () => ({ meta: [{ title: "Pagamento — Kurio" }] }),
  beforeLoad: ({ context, location }) => exigirSessao(context.queryClient, location.href),
  component: Pagina,
});

function Pagina() {
  const { usuario } = Route.useRouteContext();
  return <PaginaPagamento usuario={usuario} />;
}
