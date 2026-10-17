import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Detalhe } from "@/features/nft/detalhe";
import { lerSessao } from "@/shared/api";

export const Route = createFileRoute("/nfts/$nftId")({
  component: Pagina,
  head: ({ params }) => ({
    meta: [{ title: `Obra ${params.nftId} — Kurio` }],
  }),
});

function Pagina() {
  const { nftId } = Route.useParams();
  const sessao = useQuery({ queryKey: ["sessao"], queryFn: lerSessao });
  return <Detalhe nftId={nftId} usuarioId={sessao.data?.id} />;
}
