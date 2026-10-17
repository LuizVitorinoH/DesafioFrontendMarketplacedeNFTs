import { createFileRoute } from "@tanstack/react-router";
import { PaginaPerfil } from "@/features/conta/painel";

export const Route = createFileRoute("/conta/")({
  head: () => ({ meta: [{ title: "Perfil — Kurio" }] }),
  component: Pagina,
});

function Pagina() {
  const { usuario } = Route.useRouteContext();
  return <PaginaPerfil usuarioId={usuario.id} />;
}
