import type {
  Carteira,
  Cotacao,
  ItemCarrinho,
  Nft,
  Pedido,
  Rede,
  StatusPedido,
} from "@/shared/contracts";
import { fixo, multiplicar, percentual, somar, texto, dinheiro } from "@/shared/money";
import {
  carteirasIniciais,
  nftsIniciais,
  TAXA_REDE,
  usuariosIniciais,
  type UsuarioInterno,
} from "@/mocks/seed";

const CHAVE = "lume.dados";

export type Cupom = {
  codigo: string;
  desconto: number;
  expiraEm: number | null;
};

export type RegistroIdempotencia = {
  chave: string;
  corpoHash: string;
  pedidoId: string;
};

export type ItemGuardado = {
  id: string;
  dono: string;
  nftId: string;
  edicao: number;
  quantidade: number;
};

export type PedidoGuardado = Pedido & {
  usuarioId: string;
  chave: string;
  corpoHash: string;
};

export type Estado = {
  nfts: Nft[];
  usuarios: UsuarioInterno[];
  sessoes: Record<string, { usuarioId: string; expiraEm: number }>;
  carteiras: Array<Carteira & { usuarioId: string }>;
  favoritos: Record<string, string[]>;
  carrinhos: ItemGuardado[];
  pedidos: PedidoGuardado[];
  cupons: Cupom[];
  cupomPorDono: Record<string, string>;
  seq: number;
};

export function semear(): Estado {
  return {
    nfts: nftsIniciais(),
    usuarios: usuariosIniciais(),
    sessoes: {},
    carteiras: carteirasIniciais(),
    favoritos: { "usr-ana": ["ape-02"], "usr-bruno": [] },
    carrinhos: [],
    pedidos: [],
    cupons: [
      { codigo: "BEMVINDO", desconto: 10, expiraEm: null },
      { codigo: "EXPIRADO", desconto: 15, expiraEm: Date.parse("2020-01-01T00:00:00Z") },
    ],
    cupomPorDono: {},
    seq: 1,
  };
}

export function carregar(): Estado {
  const cru = localStorage.getItem(CHAVE);
  if (!cru) {
    const estado = semear();
    localStorage.setItem(CHAVE, JSON.stringify(estado));
    return estado;
  }
  const lido = JSON.parse(cru) as Estado;
  lido.cupomPorDono ??= {};
  return lido;
}

export function gravar(estado: Estado) {
  localStorage.setItem(CHAVE, JSON.stringify(estado));
}

export function resetar() {
  localStorage.removeItem(CHAVE);
  return carregar();
}

export function proximoId(estado: Estado, prefixo: string) {
  const id = `${prefixo}-${estado.seq}`;
  estado.seq += 1;
  return id;
}

export function nftPorId(estado: Estado, id: string) {
  return estado.nfts.find((nft) => nft.id === id);
}

export function edicaoDe(nft: Nft, numero: number) {
  return nft.edicoes.find((edicao) => edicao.numero === numero);
}

export function reservado(estado: Estado, dono: string, nftId: string, edicao: number, ignorarId?: string) {
  return estado.carrinhos
    .filter((item) => item.dono === dono && item.nftId === nftId && item.edicao === edicao && item.id !== ignorarId)
    .reduce((total, item) => total + item.quantidade, 0);
}

export function linhaCarrinho(estado: Estado, item: ItemGuardado): ItemCarrinho | null {
  const nft = nftPorId(estado, item.nftId);
  if (!nft) return null;
  const edicao = edicaoDe(nft, item.edicao);
  return {
    id: item.id,
    nftId: nft.id,
    nome: nft.nome,
    artista: nft.artista,
    variante: nft.variante,
    edicao: item.edicao,
    quantidade: item.quantidade,
    preco: nft.preco,
    restante: edicao?.restante ?? 0,
    versao: nft.versao,
  };
}

export function montarCotacao(
  estado: Estado,
  entrada: { dono: string; cupom?: string | null; rede: Rede; agora: number },
): { cotacao?: Cotacao; erro?: { code: string; message: string } } {
  const itens = estado.carrinhos.filter((item) => item.dono === entrada.dono);
  if (itens.length === 0) {
    return { erro: { code: "carrinho_vazio", message: "O carrinho está vazio." } };
  }

  const linhas = [];
  for (const item of itens) {
    const nft = nftPorId(estado, item.nftId);
    const edicao = nft && edicaoDe(nft, item.edicao);
    if (!nft || !edicao) {
      return { erro: { code: "nao_encontrado", message: "Uma obra do carrinho não existe mais." } };
    }
    if (item.quantidade > edicao.restante) {
      return {
        erro: {
          code: "estoque",
          message: `A edição ${item.edicao} de ${nft.nome} não tem quantidade suficiente.`,
        },
      };
    }
    linhas.push({
      nftId: nft.id,
      edicao: item.edicao,
      quantidade: item.quantidade,
      preco: nft.preco,
      subtotal: multiplicar(nft.preco, item.quantidade),
    });
  }

  let cupom: string | null = null;
  let desconto = "0";
  const subtotal = somar(linhas.map((linha) => linha.subtotal));
  if (entrada.cupom) {
    const codigo = entrada.cupom.trim().toUpperCase();
    const encontrado = estado.cupons.find((item) => item.codigo === codigo);
    if (!encontrado) {
      return { erro: { code: "cupom_invalido", message: "Cupom inválido." } };
    }
    if (encontrado.expiraEm !== null && encontrado.expiraEm <= entrada.agora) {
      return { erro: { code: "cupom_expirado", message: "Este cupom expirou." } };
    }
    cupom = encontrado.codigo;
    desconto = percentual(subtotal, encontrado.desconto);
  }

  const taxa = TAXA_REDE[entrada.rede];
  const total = texto(dinheiro(subtotal).minus(desconto).plus(taxa));
  const assinatura = [
    entrada.rede,
    cupom ?? "",
    ...linhas.map((linha) => `${linha.nftId}:${linha.edicao}:${linha.quantidade}:${linha.preco}`),
  ].join("|");

  return {
    cotacao: {
      id: `cot-${hashCurto(assinatura)}`,
      versao: hashNumero(assinatura),
      itens: linhas,
      subtotal,
      desconto,
      taxa,
      total,
      cupom,
      rede: entrada.rede,
    },
  };
}

export function baixarEstoque(estado: Estado, pedido: Pedido) {
  for (const linha of pedido.recibo.itens) {
    const nft = nftPorId(estado, linha.nftId);
    const edicao = nft && edicaoDe(nft, linha.edicao);
    if (!edicao) continue;
    edicao.restante -= linha.quantidade;
    if (nft) nft.versao += 1;
  }
}

export function tirarDoCarrinho(estado: Estado, dono: string, pedido: Pedido) {
  for (const linha of pedido.recibo.itens) {
    const item = estado.carrinhos.find(
      (atual) => atual.dono === dono && atual.nftId === linha.nftId && atual.edicao === linha.edicao,
    );
    if (!item) continue;
    item.quantidade -= linha.quantidade;
    if (item.quantidade <= 0) {
      estado.carrinhos = estado.carrinhos.filter((atual) => atual.id !== item.id);
    }
  }
}

export function publicarPedido(pedido: PedidoGuardado, status: StatusPedido) {
  if (pedido.status === "confirmed" || pedido.status === "declined") return false;
  pedido.status = status;
  pedido.versao += 1;
  return true;
}

function hashCurto(valor: string) {
  let h = 2166136261;
  for (let i = 0; i < valor.length; i += 1) {
    h ^= valor.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function hashNumero(valor: string) {
  return Number.parseInt(hashCurto(valor).slice(0, 6), 16);
}

export function fixarPreco(valor: string) {
  return fixo(valor);
}
