import { Link } from "@tanstack/react-router";
import { SlidersHorizontal, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { CONTAGEM_COLECAO, COLECOES } from "@/shared/colecoes";
import { listarNfts } from "@/shared/api";
import type { Nft, Ordenacao } from "@/shared/contracts";
import { exibirEth } from "@/shared/money";
import { registrarVersao } from "@/shared/eventos";
import { Retrato } from "@/interface/retrato";
import { Botao, CaixaDialogo, Esqueleto } from "@/interface/ui";
import { useState } from "react";

export type Busca = {
  q: string;
  colecao: string[];
  precoMin: string;
  precoMax: string;
  disponivel: "" | "1" | "0";
  ordenar: Ordenacao;
  pagina: number;
};

const ORDENS: Ordenacao[] = ["recentes", "preco-asc", "preco-desc", "nome"];

function normalizarColecao(valor: unknown): string[] {
  if (Array.isArray(valor)) return valor.flatMap((item) => normalizarColecao(item));
  if (typeof valor !== "string" || !valor) return [];
  if (valor.startsWith("[")) {
    try {
      return normalizarColecao(JSON.parse(valor) as unknown);
    } catch {
      return [valor];
    }
  }
  return [valor];
}

export const buscaVazia: Busca = {
  q: "",
  colecao: [],
  precoMin: "",
  precoMax: "",
  disponivel: "",
  ordenar: "recentes",
  pagina: 1,
};

export function leituraBusca(search: Record<string, unknown>): Busca {
  const colecao = normalizarColecao(search.colecao);
  const ordenar = ORDENS.includes(search.ordenar as Ordenacao) ? (search.ordenar as Ordenacao) : "recentes";
  const disponivel = search.disponivel === "1" || search.disponivel === "0" ? search.disponivel : "";
  return {
    q: typeof search.q === "string" ? search.q : "",
    colecao,
    precoMin: typeof search.precoMin === "string" ? search.precoMin : "",
    precoMax: typeof search.precoMax === "string" ? search.precoMax : "",
    disponivel,
    ordenar,
    pagina: Math.max(1, Number(search.pagina) || 1),
  };
}

function lembrarPagina(itens: Nft[]) {
  for (const item of itens) registrarVersao(`nft:${item.id}`, item.versao);
}

export function Inicio({ busca, aoBuscar }: { busca: Busca; aoBuscar: (proxima: Busca) => void }) {
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const catalogo = useQuery({
    queryKey: ["nfts", busca],
    queryFn: async ({ signal }) => {
      const pagina = await listarNfts(
        {
          q: busca.q,
          colecao: busca.colecao,
          precoMin: busca.precoMin,
          precoMax: busca.precoMax,
          disponivel: busca.disponivel === "" ? undefined : busca.disponivel === "1",
          ordenar: busca.ordenar,
          pagina: busca.pagina,
          limite: 9,
        },
        signal,
      );
      lembrarPagina(pagina.itens);
      return pagina;
    },
  });
  const destaques = useQuery({
    queryKey: ["nfts", "destaques"],
    queryFn: async ({ signal }) => {
      const pagina = await listarNfts({ limite: 24, pagina: 1, ordenar: "recentes" }, signal);
      lembrarPagina(pagina.itens);
      return pagina.itens.filter((item) => item.destaque);
    },
  });

  const hero = destaques.data?.[0];
  const segundo = destaques.data?.[1];
  const paginas = catalogo.data ? Math.max(1, Math.ceil(catalogo.data.total / catalogo.data.limite)) : 1;

  function mudar(parcial: Partial<Busca>, reinicia = true) {
    aoBuscar({ ...busca, ...parcial, pagina: reinicia ? 1 : (parcial.pagina ?? busca.pagina) });
  }

  function alternarColecao(nome: string) {
    const colecao = busca.colecao.includes(nome)
      ? busca.colecao.filter((item) => item !== nome)
      : [...busca.colecao, nome];
    mudar({ colecao });
  }

  const painel = (
    <Filtros
      busca={busca}
      aoAlternar={alternarColecao}
      aoPreco={(precoMin, precoMax) => mudar({ precoMin, precoMax })}
      aoDisponivel={(disponivel) => mudar({ disponivel })}
    />
  );

  return (
    <div>
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 pt-4 min-[1024px]:hidden">
        <form
          className="min-w-0 flex-1 md:hidden"
          onSubmit={(evento) => {
            evento.preventDefault();
            const dados = new FormData(evento.currentTarget);
            mudar({ q: String(dados.get("q") ?? "") });
          }}
        >
          <label htmlFor="busca-mobile" className="relative block">
            <span className="sr-only">Buscar coleções</span>
            <Search className="pointer-events-none absolute top-3 left-3 size-4 text-mudo" aria-hidden />
            <input id="busca-mobile" name="q" placeholder="Buscar coleções" defaultValue={busca.q} className="w-full rounded-full border border-linha bg-elevado py-2.5 pr-3 pl-9 text-sm" />
          </label>
        </form>
        <button type="button" className="grid size-11 shrink-0 place-items-center rounded-full border border-linha text-mudo" aria-label="Filtros" onClick={() => setFiltrosAbertos(true)}>
          <SlidersHorizontal className="size-4" aria-hidden />
        </button>
      </div>
      <section className="mx-auto grid max-w-6xl items-center gap-6 px-4 py-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:py-14">
        <div className="rounded-2xl bg-cartao p-4 lg:bg-transparent lg:p-0">
          <p className="text-sm text-mudo">Bem-vindo à Kurio</p>
          <div className="mt-3 grid grid-cols-[1fr_7rem] items-center gap-3 lg:block">
            <div>
              <h1 className="max-w-xl text-2xl font-semibold tracking-tight uppercase lg:mt-4 lg:text-5xl">
                Seja dono do futuro da arte digital
              </h1>
              <p className="mt-3 max-w-md text-sm leading-6 text-mudo">
                Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.
              </p>
              <a href="#catalogo" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold tracking-wide lg:mt-8">
                <span className="lg:hidden">EXPLORAR →</span>
                <Botao type="button" className="hidden px-8 tracking-wide lg:inline-flex">
                  EXPLORAR
                </Botao>
              </a>
            </div>
            <div className="flex flex-col items-end gap-2 lg:hidden">
              {hero ? (
                <Link to="/nfts/$nftId" params={{ nftId: hero.id }} className="block w-full">
                  <Retrato variante={hero.variante} titulo={hero.nome} className="aspect-square w-full rounded-2xl" />
                </Link>
              ) : (
                <Esqueleto className="aspect-square w-full" />
              )}
              {segundo ? (
                <Link to="/nfts/$nftId" params={{ nftId: segundo.id }} className="block w-14">
                  <Retrato variante={segundo.variante} titulo={segundo.nome} className="aspect-square w-full rounded-xl" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
        <div className="hidden w-full max-w-md justify-self-end lg:block">
          {hero ? (
            <Link to="/nfts/$nftId" params={{ nftId: hero.id }} className="block">
              <Retrato variante={hero.variante} titulo={hero.nome} className="aspect-square w-full rounded-3xl" />
            </Link>
          ) : (
            <Esqueleto className="aspect-square w-full" />
          )}
        </div>
      </section>

      <section id="catalogo" className="mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-[18rem_1fr]">
        <div className="hidden lg:block">{painel}</div>
        <div>
          <h2 className="sr-only">Obras</h2>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <button
                type="button"
                className={busca.ordenar === "recentes" ? "border-b-2 border-laranja pb-1 text-laranja" : "text-mudo"}
                onClick={() => mudar({ ordenar: "recentes" })}
              >
                Todos os NFTs
              </button>
            </div>
            <p className="sr-only" aria-live="polite">
              {catalogo.isFetching && catalogo.data ? "Atualizando o catálogo." : catalogo.data ? `${catalogo.data.total} obras` : ""}
            </p>
            <label className="text-sm text-mudo">
              Ordenar por
              <select
                className="ml-2 bg-transparent py-1 text-texto"
                value={busca.ordenar}
                onChange={(evento) => mudar({ ordenar: evento.target.value as Ordenacao })}
              >
                <option value="recentes">Listados recentemente</option>
                <option value="preco-asc">Menor preço</option>
                <option value="preco-desc">Maior preço</option>
                <option value="nome">Nome</option>
              </select>
            </label>
          </div>

          {catalogo.isPending ? (
            <div aria-busy="true" aria-label="Carregando obras" className="grid grid-cols-2 gap-4 xl:grid-cols-3">
              {Array.from({ length: 9 }, (_, indice) => (
                <Esqueleto key={indice} className="h-64" />
              ))}
            </div>
          ) : null}

          {catalogo.isError ? (
            <div role="alert" className="rounded-2xl border border-linha bg-cartao p-6">
              <p>Não foi possível carregar o catálogo.</p>
              <Botao type="button" className="mt-4" onClick={() => catalogo.refetch()}>
                Tentar de novo
              </Botao>
            </div>
          ) : null}

          {catalogo.data && catalogo.data.itens.length === 0 ? (
            <p className="rounded-2xl border border-linha bg-cartao p-6">Nenhuma obra com esses filtros.</p>
          ) : null}

          {catalogo.data && catalogo.data.itens.length > 0 ? (
            <ul className="grid grid-cols-2 gap-4 xl:grid-cols-3">
              {catalogo.data.itens.map((nft) => (
                <li key={nft.id}>
                  <Cartao nft={nft} />
                </li>
              ))}
            </ul>
          ) : null}

          {catalogo.data && catalogo.data.total > 0 ? (
            <nav aria-label="Paginação" className="mt-8 flex flex-wrap justify-end gap-2">
              {Array.from({ length: paginas }, (_, indice) => {
                const numero = indice + 1;
                const atual = numero === busca.pagina;
                return (
                  <button
                    key={numero}
                    type="button"
                    aria-current={atual ? "page" : undefined}
                    className={`grid size-9 place-items-center rounded-md text-sm ${atual ? "bg-laranja font-semibold text-[#1a1008]" : "bg-cartao text-mudo"}`}
                    onClick={() => mudar({ pagina: numero }, false)}
                  >
                    {numero}
                  </button>
                );
              })}
              {paginas > busca.pagina ? (
                <button type="button" className="grid size-9 place-items-center rounded-md bg-cartao text-mudo" onClick={() => mudar({ pagina: busca.pagina + 1 }, false)} aria-label="Próxima página">
                  ›
                </button>
              ) : null}
            </nav>
          ) : null}
        </div>
      </section>

      <CaixaDialogo aberto={filtrosAbertos} aoFechar={() => setFiltrosAbertos(false)} titulo="Filtros">
        {painel}
      </CaixaDialogo>
    </div>
  );
}

function Filtros({
  busca,
  aoAlternar,
  aoPreco,
  aoDisponivel,
}: {
  busca: Busca;
  aoAlternar: (nome: string) => void;
  aoPreco: (min: string, max: string) => void;
  aoDisponivel: (valor: "" | "1" | "0") => void;
}) {
  return (
    <form
      className="space-y-6 rounded-2xl border border-linha bg-cartao p-4"
      onSubmit={(evento) => {
        evento.preventDefault();
        const dados = new FormData(evento.currentTarget);
        aoPreco(String(dados.get("precoMin") ?? ""), String(dados.get("precoMax") ?? ""));
      }}
    >
      <fieldset>
        <legend className="text-sm font-semibold">Coleções</legend>
        <div className="mt-3 space-y-2">
          {COLECOES.map((nome) => (
            <label key={nome} className="flex items-center justify-between gap-2 text-sm text-mudo">
              <span className="flex items-center gap-2">
                <input type="checkbox" checked={busca.colecao.includes(nome)} onChange={() => aoAlternar(nome)} />
                {nome}
              </span>
              <span>({CONTAGEM_COLECAO[nome]})</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-semibold">Faixa de preço</legend>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-xs text-mudo">
            Mínimo
            <input name="precoMin" defaultValue={busca.precoMin} inputMode="decimal" className="mt-1 w-full rounded-lg border border-linha bg-fundo px-2 py-2 text-sm" />
          </label>
          <label className="text-xs text-mudo">
            Máximo
            <input name="precoMax" defaultValue={busca.precoMax} inputMode="decimal" className="mt-1 w-full rounded-lg border border-linha bg-fundo px-2 py-2 text-sm" />
          </label>
        </div>
        <Botao type="submit" className="mt-3">
          Aplicar
        </Botao>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-semibold">Disponibilidade</legend>
        <div className="mt-3 space-y-2 text-sm">
          {(
            [
              ["", "Todas"],
              ["1", "Com edição disponível"],
              ["0", "Esgotadas"],
            ] as const
          ).map(([valor, rotulo]) => (
            <label key={rotulo} className="flex items-center gap-2">
              <input type="radio" name="disponivel" checked={busca.disponivel === valor} onChange={() => aoDisponivel(valor)} />
              {rotulo}
            </label>
          ))}
        </div>
      </fieldset>
    </form>
  );
}

function Cartao({ nft }: { nft: Nft }) {
  const esgotada = nft.edicoes.every((edicao) => edicao.restante <= 0);
  return (
    <article>
      <Link to="/nfts/$nftId" params={{ nftId: nft.id }}>
        <Retrato variante={nft.variante} titulo={nft.nome} className="aspect-square w-full rounded-2xl" />
        <h3 className="mt-3 text-sm font-medium">{nft.nome}</h3>
      </Link>
      <p className="mt-1 text-sm font-semibold text-laranja">{esgotada ? "Esgotada" : exibirEth(nft.preco)}</p>
    </article>
  );
}
