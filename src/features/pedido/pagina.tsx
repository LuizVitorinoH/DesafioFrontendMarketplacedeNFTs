import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lerPedido } from "@/shared/api";
import { exibirEth } from "@/shared/money";
import { Esqueleto } from "@/interface/ui";

export function PaginaPedido({ pedidoId }: { pedidoId: string }) {
  const pedido = useQuery({
    queryKey: ["pedido", pedidoId],
    queryFn: ({ signal }) => lerPedido(pedidoId, signal),
    refetchInterval: (consulta) => (consulta.state.data?.status === "pending" ? 2000 : false),
  });

  if (pedido.isPending) {
    return (
      <div aria-busy="true" aria-label="Carregando pedido" className="mx-auto max-w-3xl px-4 py-10">
        <Esqueleto className="h-40" />
      </div>
    );
  }

  if (pedido.isError || !pedido.data) {
    return (
      <div role="alert" className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-semibold">Pedido indisponível.</h1>
        <button type="button" className="mt-4 underline" onClick={() => pedido.refetch()}>
          Tentar de novo
        </button>
      </div>
    );
  }

  const dados = pedido.data;

  if (dados.status === "pending") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16" role="status">
        <h1 className="text-3xl font-semibold">Pedido pendente</h1>
        <p className="mt-3 text-mudo">A simulação ainda não confirmou. Esta página recupera o mesmo pedido se a conexão cair.</p>
        <p className="mt-4 text-sm">Identificador {dados.id}</p>
      </div>
    );
  }

  if (dados.status === "declined") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16" role="alert">
        <h1 className="text-3xl font-semibold">Pagamento recusado</h1>
        <p className="mt-3 text-mudo">Os itens continuam no carrinho. Nenhum recibo foi emitido.</p>
        <Link to="/carrinho" className="mt-6 inline-block text-laranja">
          Voltar ao carrinho
        </Link>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm text-mudo">Pedido confirmado</p>
      <h1 className="mt-2 text-3xl font-semibold">Recibo {dados.id}</h1>
      <p className="mt-4 text-sm">
        Transação{" "}
        <Link to="/rede/$tx" params={{ tx: dados.transacao }} className="break-all text-laranja">
          {dados.transacao}
        </Link>
      </p>
      <ul className="mt-8 divide-y divide-linha rounded-2xl border border-linha">
        {dados.recibo.itens.map((item) => (
          <li key={`${item.nftId}-${item.edicao}`} className="flex justify-between gap-4 px-4 py-3 text-sm">
            <span>
              Edição {item.edicao} · {item.quantidade}× {exibirEth(item.preco)}
            </span>
            <span>{exibirEth(item.subtotal)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-6 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>{exibirEth(dados.recibo.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Desconto{dados.recibo.cupom ? ` (${dados.recibo.cupom})` : ""}</dt>
          <dd>{exibirEth(dados.recibo.desconto)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Taxa de rede</dt>
          <dd>{exibirEth(dados.recibo.taxa)}</dd>
        </div>
        <div className="flex justify-between text-base font-semibold">
          <dt>Total</dt>
          <dd>{exibirEth(dados.recibo.total)}</dd>
        </div>
      </dl>
      <p className="mt-6 text-sm text-mudo">Carteira {dados.recibo.carteira} na rede {dados.recibo.rede}. Referência simulada.</p>
    </article>
  );
}
