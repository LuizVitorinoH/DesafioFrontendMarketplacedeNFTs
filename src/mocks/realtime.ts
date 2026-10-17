import type { Nft, Pedido } from "@/shared/contracts";
import { carregar, gravar, nftPorId, publicarPedido, baixarEstoque, tirarDoCarrinho } from "@/mocks/store";

type Ligacao = {
  usuarioId: string | null;
  emitir: (nome: string, dados: unknown) => void;
  fechar: () => void;
};

const ligacoes: Ligacao[] = [];
const vistos = new Set<string>();

export function registrarLigacao(ligacao: Ligacao) {
  ligacoes.push(ligacao);
  return () => {
    const indice = ligacoes.indexOf(ligacao);
    if (indice >= 0) ligacoes.splice(indice, 1);
  };
}

export function emitirNft(nft: Nft) {
  const evento = {
    eventId: crypto.randomUUID(),
    tipo: "nft.updated" as const,
    recursoId: nft.id,
    versao: nft.versao,
    nft,
  };
  if (vistos.has(evento.eventId)) return;
  vistos.add(evento.eventId);
  for (const ligacao of ligacoes) ligacao.emitir("nft.updated", evento);
}

export function emitirPedido(pedido: Pedido & { usuarioId: string }) {
  const evento = {
    eventId: crypto.randomUUID(),
    tipo: "order.updated" as const,
    recursoId: pedido.id,
    versao: pedido.versao,
    usuarioId: pedido.usuarioId,
    pedido,
  };
  for (const ligacao of ligacoes) {
    if (ligacao.usuarioId === pedido.usuarioId) ligacao.emitir("order.updated", evento);
  }
}

export function repetirUltimoNft(nftId: string) {
  const nft = nftPorId(carregar(), nftId);
  if (!nft) return;
  const evento = {
    eventId: "evt-repetido",
    tipo: "nft.updated" as const,
    recursoId: nft.id,
    versao: nft.versao,
    nft,
  };
  for (const ligacao of ligacoes) {
    ligacao.emitir("nft.updated", evento);
    ligacao.emitir("nft.updated", evento);
  }
}

export function emitirVersaoAntiga(nftId: string) {
  const estado = carregar();
  const nft = nftPorId(estado, nftId);
  if (!nft) return;
  const antigo = { ...nft, preco: "0.01", versao: 1 };
  const evento = {
    eventId: crypto.randomUUID(),
    tipo: "nft.updated" as const,
    recursoId: nft.id,
    versao: 1,
    nft: antigo,
  };
  for (const ligacao of ligacoes) ligacao.emitir("nft.updated", evento);
}

export function alterarPreco(nftId: string, preco: string) {
  const estado = carregar();
  const nft = nftPorId(estado, nftId);
  if (!nft) return null;
  nft.preco = preco;
  nft.versao += 1;
  gravar(estado);
  emitirNft(nft);
  return nft;
}

export function esgotarEdicao(nftId: string, numero: number) {
  const estado = carregar();
  const nft = nftPorId(estado, nftId);
  const edicao = nft?.edicoes.find((item) => item.numero === numero);
  if (!nft || !edicao) return null;
  edicao.restante = 0;
  nft.versao += 1;
  gravar(estado);
  emitirNft(nft);
  return nft;
}

export function soltarPedido(pedidoId: string, status: "confirmed" | "declined") {
  const estado = carregar();
  const pedido = estado.pedidos.find((item) => item.id === pedidoId);
  if (!pedido) return null;
  const mudou = publicarPedido(pedido, status);
  if (!mudou) return pedido;
  if (status === "confirmed") {
    baixarEstoque(estado, pedido);
    tirarDoCarrinho(estado, pedido.usuarioId, pedido);
  }
  gravar(estado);
  emitirPedido(pedido);
  return pedido;
}

export function cairConexoes() {
  for (const ligacao of [...ligacoes]) ligacao.fechar();
}

export function identificar(indice: number, usuarioId: string | null) {
  const ligacao = ligacoes[indice];
  if (ligacao) ligacao.usuarioId = usuarioId;
}

export function ligacoesAtuais() {
  return ligacoes;
}
