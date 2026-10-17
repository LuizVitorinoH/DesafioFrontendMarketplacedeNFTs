import { setupWorker } from "msw/browser";
import { handlers } from "@/mocks/handlers";
import { socketHandlers } from "@/mocks/socket";
import { resetar } from "@/mocks/store";
import {
  alterarPreco,
  cairConexoes,
  emitirVersaoAntiga,
  esgotarEdicao,
  repetirUltimoNft,
  soltarPedido,
} from "@/mocks/realtime";

export const worker = setupWorker(...handlers, ...socketHandlers);

declare global {
  interface Window {
    __lume: {
      resetar: () => void;
      alterarPreco: (nftId: string, preco: string) => void;
      esgotar: (nftId: string, numero: number) => void;
      repetir: (nftId: string) => void;
      antigo: (nftId: string) => void;
      soltarPedido: (pedidoId: string, status: "confirmed" | "declined") => void;
      cairConexao: () => void;
    };
  }
}

window.__lume = {
  resetar: () => {
    resetar();
  },
  alterarPreco: (nftId, preco) => {
    alterarPreco(nftId, preco);
  },
  esgotar: (nftId, numero) => {
    esgotarEdicao(nftId, numero);
  },
  repetir: repetirUltimoNft,
  antigo: emitirVersaoAntiga,
  soltarPedido: (pedidoId, status) => {
    soltarPedido(pedidoId, status);
  },
  cairConexao: cairConexoes,
};
