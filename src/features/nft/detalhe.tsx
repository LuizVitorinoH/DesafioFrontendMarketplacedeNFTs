import { Link, useNavigate } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adicionarItem, desfavoritar, favoritar, idVisitante, lerFavoritos, lerNft, listarNfts, mensagemErro } from "@/shared/api";
import type { Nft } from "@/shared/contracts";
import { exibirEth } from "@/shared/money";
import { registrarVersao } from "@/shared/eventos";
import { buscaVazia } from "@/features/catalogo/inicio";
import { Retrato } from "@/interface/retrato";
import { Botao, Esqueleto } from "@/interface/ui";

export function Detalhe({ nftId, usuarioId }: { nftId: string; usuarioId?: string }) {
  const navigate = useNavigate();
  const cliente = useQueryClient();
  const dono = usuarioId ?? idVisitante();
  const obra = useQuery({
    queryKey: ["nft", nftId],
    queryFn: async ({ signal }) => {
      const nft = await lerNft(nftId, signal);
      registrarVersao(`nft:${nft.id}`, nft.versao);
      return nft;
    },
  });
  const favoritos = useQuery({
    queryKey: ["favoritos", usuarioId],
    queryFn: ({ signal }) => lerFavoritos(signal),
    enabled: Boolean(usuarioId),
  });
  const colecao = obra.data?.colecao;
  const relacionadas = useQuery({
    queryKey: ["nfts", "relacionadas", colecao],
    enabled: Boolean(colecao),
    queryFn: ({ signal }) => listarNfts({ colecao: [colecao ?? ""], limite: 8, pagina: 1 }, signal),
  });
  const [edicao, setEdicao] = useState(1);
  const [quantidade, setQuantidade] = useState(1);
  const [erro, setErro] = useState("");

  const nft = obra.data;
  const escolhida = nft?.edicoes.find((item) => item.numero === edicao) ?? nft?.edicoes[0];
  const restante = escolhida?.restante ?? 0;
  const favorito = favoritos.data?.some((item) => item.id === nftId) ?? false;

  const salvarFavorito = useMutation({
    mutationFn: async () => {
      if (favorito) await desfavoritar(nftId);
      else await favoritar(nftId);
    },
    onMutate: async () => {
      await cliente.cancelQueries({ queryKey: ["favoritos", usuarioId] });
      const anterior = cliente.getQueryData<Nft[]>(["favoritos", usuarioId]);
      cliente.setQueryData<Nft[]>(["favoritos", usuarioId], (atual = []) => {
        if (favorito) return atual.filter((item) => item.id !== nftId);
        return nft ? [...atual, nft] : atual;
      });
      return { anterior };
    },
    onError: (falha, _vars, contexto) => {
      if (contexto?.anterior) cliente.setQueryData(["favoritos", usuarioId], contexto.anterior);
      setErro(mensagemErro(falha).message);
    },
    onSettled: () => cliente.invalidateQueries({ queryKey: ["favoritos", usuarioId] }),
  });

  const comprar = useMutation({
    mutationFn: () => adicionarItem(nftId, escolhida?.numero ?? 1, quantidade),
    onSuccess: (carrinho) => {
      cliente.setQueryData(["carrinho", dono], carrinho);
      void navigate({ to: "/carrinho" });
    },
    onError: (falha) => setErro(mensagemErro(falha).message),
  });

  if (obra.isPending) {
    return (
      <div aria-busy="true" aria-label="Carregando obra" className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-2">
        <Esqueleto className="h-[28rem]" />
        <Esqueleto className="h-64" />
      </div>
    );
  }

  if (obra.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16" role="alert">
        <h1 className="text-3xl font-semibold">Obra não encontrada.</h1>
        <p className="mt-3 text-mudo">O identificador não corresponde a uma obra do catálogo.</p>
        <Link to="/" search={buscaVazia} className="mt-6 inline-block text-laranja">
          Voltar ao início
        </Link>
      </div>
    );
  }

  if (!nft || !escolhida) return null;

  const outras = (relacionadas.data?.itens ?? []).filter((item) => item.id !== nft.id).slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-44 lg:py-10 lg:pb-10">
      <div className="mb-4 flex items-center justify-between lg:hidden">
        <Link to="/" search={buscaVazia} className="grid size-10 place-items-center rounded-full border border-linha" aria-label="Voltar ao início">
          ←
        </Link>
        <button
          type="button"
          className="grid size-10 place-items-center rounded-full border border-linha"
          aria-pressed={favorito}
          aria-label={favorito ? "Remover dos favoritos" : "Favoritar"}
          onClick={() => {
            if (!usuarioId) {
              void navigate({ to: "/entrar", search: { redirect: `/nfts/${nft.id}` } });
              return;
            }
            setErro("");
            salvarFavorito.mutate();
          }}
        >
          <Heart className={`size-4 ${favorito ? "fill-laranja text-laranja" : ""}`} aria-hidden />
        </button>
      </div>
      <nav className="mb-6 hidden text-sm text-mudo lg:block" aria-label="Trilha">
        <Link to="/" search={buscaVazia} className="hover:text-texto">
          Início
        </Link>
        <span aria-hidden> / </span>
        <a href="/#catalogo" className="hover:text-texto">
          Mercado
        </a>
      </nav>
      <article className="grid gap-8 lg:grid-cols-[auto_1fr]">
        <div className="flex gap-3">
          <ul className="hidden flex-col gap-2 lg:flex" aria-label="Edições">
            {nft.edicoes.map((item) => (
              <li key={item.numero}>
                <button
                  type="button"
                  aria-pressed={item.numero === escolhida.numero}
                  className={`rounded-xl border p-1 ${item.numero === escolhida.numero ? "border-laranja" : "border-linha"}`}
                  onClick={() => {
                    setEdicao(item.numero);
                    setQuantidade(1);
                  }}
                >
                  <Retrato variante={nft.variante} titulo={`${nft.nome}, edição ${item.numero}`} className="size-14 rounded-lg lg:size-16" />
                </button>
              </li>
            ))}
          </ul>
          <Retrato variante={nft.variante} titulo={nft.nome} className="aspect-square w-full max-w-md rounded-3xl" />
        </div>
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-3xl font-semibold">{nft.nome}</h1>
            <p className="text-xl font-semibold text-laranja">{exibirEth(nft.preco)}</p>
          </div>
          <p className="mt-2 text-sm text-mudo">{nft.artista}</p>
          <p className="mt-4 max-w-xl text-sm leading-6 text-mudo">{nft.descricao}</p>
          <div className="mt-4 flex flex-wrap gap-2 lg:hidden">
            {nft.edicoes.map((item) => (
              <button
                key={item.numero}
                type="button"
                aria-pressed={item.numero === escolhida.numero}
                className={`rounded-full border px-3 py-1 text-sm ${item.numero === escolhida.numero ? "border-laranja text-laranja" : "border-linha text-mudo"}`}
                onClick={() => {
                  setEdicao(item.numero);
                  setQuantidade(1);
                }}
              >
                Edição {item.numero}
              </button>
            ))}
          </div>
          <p className="mt-6 text-sm">
            Edição {escolhida.numero}
            {restante > 0 ? ` · ${restante} disponíveis` : " · esgotada"}
          </p>
          <p id="limite-quantidade" className="mt-2 text-sm text-mudo max-lg:sr-only">
            {restante > 0 ? `Máximo de ${restante} nesta edição.` : "Edição indisponível."}
          </p>
          {quantidade > restante ? <p className="mt-2 text-sm text-perigo">A quantidade passa do estoque desta edição.</p> : null}
          {erro ? (
            <p role="alert" className="mt-3 text-sm text-perigo">
              {erro}
            </p>
          ) : null}
          <div className="fixed inset-x-0 bottom-0 z-20 space-y-3 border-t border-linha bg-fundo p-4 lg:static lg:mt-6 lg:space-y-4 lg:border-0 lg:bg-transparent lg:p-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 rounded-full border border-linha px-2 py-1">
                <span className="pl-1 text-sm text-mudo lg:sr-only">Qtd.</span>
                <button type="button" className="size-8 rounded-full text-lg" aria-label="Diminuir quantidade" onClick={() => setQuantidade((valor) => Math.max(1, valor - 1))}>
                  −
                </button>
                <label className="text-sm">
                  <span className="sr-only">Quantidade</span>
                  <input
                    className="w-12 bg-transparent text-center"
                    type="number"
                    min={1}
                    max={Math.max(restante, 1)}
                    value={quantidade}
                    aria-describedby="limite-quantidade"
                    onChange={(evento) => setQuantidade(Number(evento.target.value))}
                  />
                </label>
                <button
                  type="button"
                  className="size-8 rounded-full text-lg"
                  aria-label="Aumentar quantidade"
                  onClick={() => setQuantidade((valor) => Math.min(Math.max(restante, 1), valor + 1))}
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Botao type="button" className="flex-1 rounded-full" aria-label="Adicionar ao carrinho" disabled={restante < 1 || quantidade < 1 || quantidade > restante || comprar.isPending} onClick={() => comprar.mutate()}>
                <span className="lg:hidden">Comprar NFT</span>
                <span className="hidden lg:inline">Adicionar ao carrinho</span>
              </Botao>
              <Botao
                type="button"
                tom="borda"
                className="hidden lg:inline-flex"
                aria-pressed={favorito}
                onClick={() => {
                  if (!usuarioId) {
                    void navigate({ to: "/entrar", search: { redirect: `/nfts/${nft.id}` } });
                    return;
                  }
                  setErro("");
                  salvarFavorito.mutate();
                }}
              >
                {favorito ? "Remover dos favoritos" : "Favoritar"}
              </Botao>
            </div>
          </div>
        </div>
      </article>
      {outras.length > 0 ? (
        <section className="mt-14">
          <h2 className="text-lg font-semibold">Mais desta coleção</h2>
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {outras.map((item) => (
              <li key={item.id}>
                <Link to="/nfts/$nftId" params={{ nftId: item.id }}>
                  <Retrato variante={item.variante} titulo={item.nome} className="aspect-square w-full rounded-2xl" />
                  <h3 className="mt-2 text-sm">{item.nome}</h3>
                </Link>
                <p className="text-sm font-semibold text-laranja">{exibirEth(item.preco)}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
