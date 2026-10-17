import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PaginaCarrinho } from "@/features/carrinho/pagina";
import { lerSessao } from "@/shared/api";

export const Route = createFileRoute("/carrinho")({
  component: Pagina,
  head: () => ({ meta: [{ title: "Carrinho — Kurio" }] }),
});

function Pagina() {
  const sessao = useQuery({ queryKey: ["sessao"], queryFn: lerSessao });
  return <PaginaCarrinho usuarioId={sessao.data?.id} />;
}
