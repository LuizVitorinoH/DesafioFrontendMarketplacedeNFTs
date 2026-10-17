import { createRootRouteWithContext, HeadContent, Outlet, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Casco } from "@/interface/casco";
import { TempoReal } from "@/realtime/tempo-real";
import { lerSessao } from "@/shared/api";
import { limparEventos } from "@/shared/eventos";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { title: "Kurio — marketplace de obras digitais" },
      {
        name: "description",
        content: "Marketplace de obras digitais com catálogo, carrinho, cotação em ETH e pedido simulado.",
      },
    ],
  }),
  component: Raiz,
});

function Raiz() {
  const cliente = useQueryClient();
  const router = useRouter();
  const sessao = useQuery({ queryKey: ["sessao"], queryFn: lerSessao });

  useEffect(() => {
    const aoExpirar = () => {
      limparEventos();
      cliente.clear();
      const destino = `${window.location.pathname}${window.location.search}`;
      if (destino.startsWith("/entrar") || destino.startsWith("/cadastro")) return;
      void router.navigate({ to: "/entrar", search: { redirect: destino } });
    };
    window.addEventListener("lume:sessao-expirada", aoExpirar);
    return () => window.removeEventListener("lume:sessao-expirada", aoExpirar);
  }, [cliente, router]);

  return (
    <>
      <HeadContent />
      <TempoReal usuarioId={sessao.data?.id} />
      <Casco usuario={sessao.data ?? null}>
        <Outlet />
      </Casco>
    </>
  );
}
