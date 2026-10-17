import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { alterarQuantidade, cotar, idVisitante, lerCarrinho, mensagemErro, removerItem } from "@/shared/api";
import type { Cotacao } from "@/shared/contracts";
import { esquemaCupom } from "@/shared/formularios";
import { exibirEth } from "@/shared/money";
import { buscaVazia } from "@/features/catalogo/inicio";
import { Retrato } from "@/interface/retrato";
import { Botao, Esqueleto } from "@/interface/ui";

export function PaginaCarrinho({ usuarioId }: { usuarioId?: string }) {
  const cliente = useQueryClient();
  const dono = usuarioId ?? idVisitante();
  const cupomForm = useForm({ resolver: zodResolver(esquemaCupom), defaultValues: { cupom: "" } });
  const [erroCupom, setErroCupom] = useState("");
  const carrinho = useQuery({
    queryKey: ["carrinho", dono],
    queryFn: ({ signal }) => lerCarrinho(signal),
  });
  const cotacao = useQuery({
    queryKey: ["cotacao", dono, "ethereum"],
    queryFn: () => cotar({ rede: "ethereum", manterCupom: true }),
    enabled: (carrinho.data?.itens.length ?? 0) > 0,
  });

  const atualizar = useMutation({
    mutationFn: ({ id, quantidade }: { id: string; quantidade: number }) => alterarQuantidade(id, quantidade),
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: ["carrinho", dono] });
      void cliente.invalidateQueries({ queryKey: ["cotacao", dono] });
    },
  });
  const remover = useMutation({
    mutationFn: (id: string) => removerItem(id),
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: ["carrinho", dono] });
      void cliente.invalidateQueries({ queryKey: ["cotacao", dono] });
    },
  });
  const aplicar = useMutation({
    mutationFn: (codigo: string | null) => cotar({ cupom: codigo, rede: "ethereum" }),
    onSuccess: (data) => {
      cliente.setQueryData(["cotacao", dono, "ethereum"], data);
      setErroCupom("");
      cupomForm.setValue("cupom", data.cupom ?? "");
    },
    onError: (falha) => setErroCupom(mensagemErro(falha).message),
  });

  if (carrinho.isPending) {
    return (
      <div aria-busy="true" aria-label="Carregando carrinho" className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[1fr_20rem]">
        <Esqueleto className="h-64" />
        <Esqueleto className="h-48" />
      </div>
    );
  }

  const itens = carrinho.data?.itens ?? [];

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 lg:grid-cols-[1fr_22rem] lg:py-10">
      <section>
        <nav className="mb-4 hidden text-sm text-mudo lg:block" aria-label="Trilha">
          <Link to="/" search={buscaVazia}>
            Início
          </Link>
          <span aria-hidden> / </span>
          <a href="/#catalogo">Mercado</a>
          <span aria-hidden> / </span>
          <span className="text-texto">Carrinho</span>
        </nav>
        <Link to="/" search={buscaVazia} className="mb-4 inline-flex size-10 items-center justify-center rounded-full border border-linha lg:hidden" aria-label="Voltar ao início">
          ←
        </Link>
        <h1 className="text-center text-xl font-semibold lg:text-left lg:text-3xl">
          <span className="lg:hidden">Carrinho de NFTs</span>
          <span className="hidden lg:inline">Carrinho</span>
        </h1>
        {carrinho.isError ? (
          <div role="alert" className="mt-6">
            <p>Não foi possível carregar o carrinho.</p>
            <Botao type="button" className="mt-3" onClick={() => carrinho.refetch()}>
              Tentar de novo
            </Botao>
          </div>
        ) : null}
        {itens.length === 0 ? <p className="mt-6 text-mudo">O carrinho está vazio.</p> : null}
        {itens.length > 0 ? (
          <div className="mt-4 hidden grid-cols-[1fr_5rem_8rem_6rem_2rem] gap-3 px-2 text-xs text-mudo lg:grid">
            <span>NFTs</span>
            <span>Preço</span>
            <span>Edição</span>
            <span>Total</span>
            <span className="sr-only">Remover</span>
          </div>
        ) : null}
        <ul className="mt-3 space-y-3">
          {itens.map((item) => {
            const linha = cotacao.data?.itens.find((parte) => parte.nftId === item.nftId && parte.edicao === item.edicao);
            return (
              <li key={item.id} className="rounded-2xl bg-cartao p-3">
                <div className="flex items-center gap-3">
                  <Link to="/nfts/$nftId" params={{ nftId: item.nftId }} className="flex min-w-0 flex-1 items-center gap-3">
                    <Retrato variante={item.variante} titulo={item.nome} className="size-16 shrink-0 rounded-xl" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{item.nome}</span>
                      <span className="block text-xs text-mudo">Edição {item.edicao}</span>
                      <span className="mt-1 block text-sm font-semibold text-laranja lg:hidden">{exibirEth(item.preco)}</span>
                    </span>
                  </Link>
                  <p className="hidden w-20 text-sm lg:block">{exibirEth(item.preco)}</p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="size-7 rounded-full border border-linha"
                      aria-label={`Diminuir ${item.nome}`}
                      onClick={() => {
                        if (item.quantidade > 1) atualizar.mutate({ id: item.id, quantidade: item.quantidade - 1 });
                      }}
                    >
                      −
                    </button>
                    <label className="text-sm">
                      <span className="sr-only">Quantidade de {item.nome}</span>
                      <input
                        className="w-10 bg-transparent text-center"
                        type="number"
                        min={1}
                        max={Math.max(item.restante, 1)}
                        value={item.quantidade}
                        onChange={(evento) => {
                          const quantidade = Number(evento.target.value);
                          if (Number.isInteger(quantidade) && quantidade >= 1) atualizar.mutate({ id: item.id, quantidade });
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="size-7 rounded-full border border-linha"
                      aria-label={`Aumentar ${item.nome}`}
                      onClick={() => atualizar.mutate({ id: item.id, quantidade: Math.min(item.quantidade + 1, Math.max(item.restante, item.quantidade)) })}
                    >
                      +
                    </button>
                  </div>
                  <p className="hidden w-24 text-sm lg:block">{linha ? exibirEth(linha.subtotal) : "—"}</p>
                  <button type="button" className="text-sm text-mudo" aria-label={`Remover ${item.nome}`} onClick={() => remover.mutate(item.id)}>
                    ×
                  </button>
                </div>
                {item.quantidade > item.restante ? <p className="mt-2 text-sm text-perigo">A disponibilidade desta edição mudou.</p> : null}
              </li>
            );
          })}
        </ul>
      </section>
      <Resumo cotacao={cotacao.data} carregando={cotacao.isPending && itens.length > 0} erro={cotacao.isError} aoTentar={() => cotacao.refetch()}>
        <form
          className="mt-4 space-y-2"
          onSubmit={cupomForm.handleSubmit((valores) => aplicar.mutate(valores.cupom.trim() ? valores.cupom : null))}
        >
          <label htmlFor="cupom" className="sr-only">
            Cupom
          </label>
          <div className="flex gap-2">
            <input id="cupom" placeholder="Digite o código promocional..." className="w-full rounded-lg border border-linha bg-fundo px-3 py-2 text-sm" {...cupomForm.register("cupom")} />
            <Botao type="submit">
              Aplicar
            </Botao>
          </div>
          {cotacao.data?.cupom ? (
            <button type="button" className="text-sm underline" onClick={() => aplicar.mutate(null)}>
              Remover cupom
            </button>
          ) : null}
          {erroCupom ? (
            <p role="alert" className="text-sm text-perigo">
              {erroCupom}
            </p>
          ) : null}
        </form>
        <Botao asChild className="mt-4 w-full rounded-full">
          <Link to="/pagamento" aria-label="Ir para pagamento">
            <span className="lg:hidden">Conectar e finalizar</span>
            <span className="hidden lg:inline">Ir para pagamento</span>
          </Link>
        </Botao>
        <Link to="/" search={buscaVazia} className="mt-3 hidden text-center text-sm text-mudo lg:block">
          Continuar explorando
        </Link>
      </Resumo>
    </div>
  );
}

export function Resumo({
  cotacao,
  carregando,
  erro,
  aoTentar,
  children,
}: {
  cotacao?: Cotacao;
  carregando?: boolean;
  erro?: boolean;
  aoTentar?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <aside className="h-fit rounded-2xl border border-linha bg-cartao p-5">
      <h2 className="font-semibold">Resumo da carteira</h2>
      {carregando ? (
        <div aria-busy="true" aria-label="Carregando resumo" className="mt-4 space-y-2">
          <Esqueleto className="h-5" />
          <Esqueleto className="h-5" />
          <Esqueleto className="h-5" />
        </div>
      ) : null}
      {erro ? (
        <div role="alert" className="mt-4 text-sm">
          <p>Não foi possível calcular a cotação.</p>
          {aoTentar ? (
            <button type="button" className="mt-2 underline" onClick={aoTentar}>
              Tentar de novo
            </button>
          ) : null}
        </div>
      ) : null}
      {cotacao ? (
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt>Subtotal</dt>
            <dd>{exibirEth(cotacao.subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Desconto do lançamento</dt>
            <dd>{exibirEth(cotacao.desconto)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Taxa de rede</dt>
            <dd>{exibirEth(cotacao.taxa)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-linha pt-2 font-semibold">
            <dt>Total</dt>
            <dd>{exibirEth(cotacao.total)}</dd>
          </div>
        </dl>
      ) : null}
      {children}
    </aside>
  );
}
