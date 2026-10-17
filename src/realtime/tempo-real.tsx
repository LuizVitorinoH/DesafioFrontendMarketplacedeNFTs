import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Socket } from "socket.io-client";
import type { EventoNft, EventoPedido, Nft, PaginaNfts, Carrinho, Pedido } from "@/shared/contracts";
import { tokenSessao } from "@/shared/api";
import { aceitarEvento, anunciar, registrarVersao } from "@/shared/eventos";

const ENDERECO = "wss://marketplace.local";

function fundirNft(atual: Nft | undefined, nft: Nft) {
  if (atual && atual.versao > nft.versao) return atual;
  registrarVersao(`nft:${nft.id}`, nft.versao);
  return nft;
}

export function TempoReal({ usuarioId }: { usuarioId?: string }) {
  const cliente = useQueryClient();

  useEffect(() => {
    let ativo = true;
    let socket: Socket | undefined;

    void import("socket.io-client").then(({ io }) => {
      if (!ativo) return;
      socket = io(ENDERECO, { transports: ["websocket"], reconnection: true, reconnectionDelay: 400 });
      socket.on("connect", () => {
        socket?.emit("sessao", tokenSessao());
        void cliente.invalidateQueries({ queryKey: ["nfts"] });
        void cliente.invalidateQueries({ queryKey: ["nft"] });
        void cliente.invalidateQueries({ queryKey: ["carrinho"] });
        void cliente.invalidateQueries({ queryKey: ["pedido"] });
        void cliente.invalidateQueries({ queryKey: ["cotacao"] });
      });
      socket.on("nft.updated", (evento: EventoNft) => {
        if (!aceitarEvento(evento.eventId, `nft:${evento.recursoId}`, evento.versao)) return;
        cliente.setQueriesData<PaginaNfts>({ queryKey: ["nfts"] }, (pagina) => {
          if (!pagina) return pagina;
          return { ...pagina, itens: pagina.itens.map((item) => (item.id === evento.nft.id ? fundirNft(item, evento.nft) : item)) };
        });
        cliente.setQueryData<Nft>(["nft", evento.nft.id], (atual) => fundirNft(atual, evento.nft));
        cliente.setQueriesData<Carrinho>({ queryKey: ["carrinho"] }, (carrinho) => {
          if (!carrinho) return carrinho;
          return {
            itens: carrinho.itens.map((item) =>
              item.nftId === evento.nft.id
                ? {
                    ...item,
                    preco: evento.nft.preco,
                    versao: evento.nft.versao,
                    restante: evento.nft.edicoes.find((edicao) => edicao.numero === item.edicao)?.restante ?? item.restante,
                  }
                : item,
            ),
          };
        });
        void cliente.invalidateQueries({ queryKey: ["cotacao"] });
        anunciar(`Preço ou disponibilidade de ${evento.nft.nome} mudou.`);
      });
      socket.on("order.updated", (evento: EventoPedido) => {
        if (usuarioId && evento.usuarioId !== usuarioId) return;
        if (!aceitarEvento(evento.eventId, `pedido:${evento.recursoId}`, evento.versao)) return;
        cliente.setQueryData<Pedido>(["pedido", evento.pedido.id], (atual) => {
          if (atual && atual.versao > evento.pedido.versao) return atual;
          return evento.pedido;
        });
        if (evento.pedido.status === "confirmed") {
          void cliente.invalidateQueries({ queryKey: ["carrinho"] });
          anunciar("Pedido confirmado.");
        }
        if (evento.pedido.status === "declined") anunciar("Pedido recusado.");
      });
    });

    return () => {
      ativo = false;
      socket?.removeAllListeners();
      socket?.disconnect();
    };
  }, [cliente, usuarioId]);

  return null;
}
