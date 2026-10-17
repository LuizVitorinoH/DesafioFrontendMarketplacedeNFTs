import type { Carteira, Nft, UsuarioPublico } from "@/shared/contracts";
import { COLECOES } from "@/shared/colecoes";

export const SENHA_HASH =
  "15e450e51731adb398707826ddfd2d3103cba0cd32f30b3725b1e2686ac6ef87";

export type UsuarioInterno = UsuarioPublico & {
  senhaHash: string;
};

const obras: Array<Omit<Nft, "versao">> = [
  ["ape-01", "Óculos verde", "Marina Luz", "Verde", 0, "1.84", true, [[1, 4], [2, 2]]],
  ["ape-02", "Capuz lilás", "Caio Pires", "Lilás", 1, "0.96", true, [[1, 3]]],
  ["ape-03", "Chapéu de feltro", "Helena Voss", "Areia", 2, "1.25", true, [[1, 1], [2, 0]]],
  ["ape-04", "Gola alta", "Davi Nunes", "Verde", 3, "0.74", true, [[1, 6]]],
  ["ape-05", "Luz de estúdio", "Marina Luz", "Areia", 4, "2.10", false, [[1, 2]]],
  ["ape-06", "Perfil noturno", "Helena Voss", "Lilás", 5, "0.58", false, [[1, 5]]],
  ["ape-07", "Casaco curto", "Caio Pires", "Verde", 6, "1.42", false, [[1, 2], [2, 2]]],
  ["ape-08", "Olhar de lado", "Davi Nunes", "Areia", 7, "0.88", false, [[1, 0]]],
  ["ape-09", "Lenço claro", "Marina Luz", "Areia", 8, "1.05", false, [[1, 3]]],
  ["ape-10", "Sombra roxa", "Helena Voss", "Lilás", 9, "0.67", false, [[1, 4]]],
  ["ape-11", "Jaqueta aberta", "Caio Pires", "Verde", 0, "1.63", false, [[1, 2]]],
  ["ape-12", "Fone baixo", "Davi Nunes", "Lilás", 1, "0.49", false, [[1, 7]]],
  ["ape-13", "Tarde quente", "Marina Luz", "Areia", 2, "1.11", false, [[1, 3]]],
  ["ape-14", "Verde musgo", "Helena Voss", "Verde", 3, "0.92", false, [[1, 1]]],
  ["ape-15", "Retrato seco", "Caio Pires", "Areia", 4, "2.40", false, [[1, 2]]],
  ["ape-16", "Capuz fechado", "Davi Nunes", "Lilás", 5, "0.81", false, [[1, 4]]],
  ["ape-17", "Óculos finos", "Marina Luz", "Verde", 6, "1.33", false, [[1, 2]]],
  ["ape-18", "Fundo creme", "Helena Voss", "Areia", 7, "0.55", false, [[1, 8]]],
  ["ape-19", "Gola levantada", "Caio Pires", "Lilás", 8, "1.08", false, [[1, 0]]],
  ["ape-20", "Estúdio 4", "Davi Nunes", "Verde", 9, "0.77", false, [[1, 3]]],
  ["ape-21", "Manhã lenta", "Marina Luz", "Areia", 2, "1.19", false, [[1, 2]]],
  ["ape-22", "Noite lilás", "Helena Voss", "Lilás", 5, "0.64", false, [[1, 5]]],
  ["ape-23", "Paletó", "Caio Pires", "Verde", 3, "1.57", false, [[1, 1]]],
  ["ape-24", "Última prova", "Davi Nunes", "Areia", 4, "0.99", false, [[1, 2]]],
].map((linha) => {
  const [id, nome, artista, colecao, variante, preco, destaque, edicoes] = linha as [
    string,
    string,
    string,
    string,
    number,
    string,
    boolean,
    Array<[number, number]>,
  ];
  return {
    id,
    nome,
    artista,
    colecao,
    variante,
    preco,
    destaque,
    descricao: `${nome} faz parte da coleção ${colecao}, assinada por ${artista}. A edição numerada sai do estoque só quando o pedido é confirmado.`,
    edicoes: edicoes.map(([numero, restante]) => ({ numero, restante })),
  };
});

export function nftsIniciais(): Nft[] {
  return obras.map((obra) => ({ ...obra, versao: 1, edicoes: obra.edicoes.map((edicao) => ({ ...edicao })) }));
}

export function usuariosIniciais(): UsuarioInterno[] {
  return [
    {
      id: "usr-ana",
      nome: "Ana Ribeiro",
      email: "ana@lume.dev",
      avatar: null,
      senhaHash: SENHA_HASH,
    },
    {
      id: "usr-bruno",
      nome: "Bruno Teixeira",
      email: "bruno@lume.dev",
      avatar: null,
      senhaHash: SENHA_HASH,
    },
  ];
}

export function carteirasIniciais(): Array<Carteira & { usuarioId: string }> {
  return [
    {
      id: "wal-ana-1",
      usuarioId: "usr-ana",
      apelido: "Principal",
      endereco: "0x1111111111111111111111111111111111111111",
      principal: true,
    },
    {
      id: "wal-ana-2",
      usuarioId: "usr-ana",
      apelido: "Reserva",
      endereco: "0x2222222222222222222222222222222222222222",
      principal: false,
    },
    {
      id: "wal-bruno-1",
      usuarioId: "usr-bruno",
      apelido: "Estúdio",
      endereco: "0x3333333333333333333333333333333333333333",
      principal: true,
    },
  ];
}

export { COLECOES };

export const TAXA_REDE: Record<"ethereum" | "polygon", string> = {
  ethereum: "0.004",
  polygon: "0.001",
};
