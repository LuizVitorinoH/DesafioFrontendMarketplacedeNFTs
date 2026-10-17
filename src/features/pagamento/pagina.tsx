import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { conectarCarteira, cotar, criarPedido, lerCarteiras, mensagemErro } from "@/shared/api";
import type { Cotacao, Rede, UsuarioPublico } from "@/shared/contracts";
import { aplicarErros, esquemaPagamento } from "@/shared/formularios";
import { exibirEth } from "@/shared/money";
import { Botao, Campo } from "@/interface/ui";
import { Resumo } from "@/features/carrinho/pagina";

type Conexao = { carteiraId: string; rede: Rede; endereco: string };

export function PaginaPagamento({ usuario }: { usuario: UsuarioPublico }) {
  const navigate = useNavigate();
  const cliente = useQueryClient();
  const carteiras = useQuery({
    queryKey: ["carteiras", usuario.id],
    queryFn: ({ signal }) => lerCarteiras(signal),
  });
  const [rede, setRede] = useState<Rede>("ethereum");
  const [conexao, setConexao] = useState<Conexao | null>(null);
  const [aviso, setAviso] = useState("");
  const [revisada, setRevisada] = useState<Cotacao | null>(null);
  const form = useForm({
    resolver: zodResolver(esquemaPagamento),
    defaultValues: { nome: usuario.nome, email: usuario.email, documento: "", carteiraId: "" },
  });
  const carteiraId = form.watch("carteiraId");

  const atual = useQuery({
    queryKey: ["cotacao", usuario.id, rede, "pagamento"],
    queryFn: () => cotar({ rede, manterCupom: true }),
  });

  const conectar = useMutation({
    mutationFn: () => conectarCarteira(carteiraId, rede),
    onSuccess: (data) => {
      setConexao({ carteiraId, rede, endereco: data.endereco });
      setAviso("");
      form.clearErrors("root");
    },
    onError: (falha) => setAviso(mensagemErro(falha).message),
  });

  const enviar = useMutation({
    mutationFn: async (cotacao: Cotacao) => {
      const valores = form.getValues();
      const corpo = {
        cotacaoId: cotacao.id,
        cotacaoVersao: cotacao.versao,
        carteiraId: valores.carteiraId,
        rede,
        nome: valores.nome,
        email: valores.email,
        documento: valores.documento,
      };
      const hash = JSON.stringify(corpo);
      const guardado = sessionStorage.getItem("lume.idempotencia");
      const chave = guardado && JSON.parse(guardado).hash === hash ? JSON.parse(guardado).key : crypto.randomUUID();
      sessionStorage.setItem("lume.idempotencia", JSON.stringify({ hash, key: chave }));
      return criarPedido(corpo, chave);
    },
    onSuccess: async (pedido) => {
      await cliente.invalidateQueries({ queryKey: ["carrinho"] });
      await cliente.invalidateQueries({ queryKey: ["pedido", pedido.id] });
      void navigate({ to: "/pedidos/$pedidoId", params: { pedidoId: pedido.id } });
    },
    onError: (falha) => {
      const info = mensagemErro(falha);
      aplicarErros(form, info.fields);
      setAviso(info.message);
      if (info.code === "cotacao_desatualizada" || info.code === "estoque") {
        void atual.refetch();
      }
    },
  });

  const mudou = Boolean(revisada && atual.data && (atual.data.versao !== revisada.versao || atual.data.total !== revisada.total));

  function revisar(valores: { nome: string; email: string; documento: string; carteiraId: string }) {
    if (!conexao || conexao.carteiraId !== valores.carteiraId || conexao.rede !== rede) {
      form.setError("root", { message: "Conecte a carteira nesta rede." });
      return;
    }
    if (!atual.data) return;
    form.clearErrors("root");
    setRevisada(atual.data);
    setAviso("");
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 lg:grid-cols-[1fr_22rem] lg:py-10">
      <section>
        <Link to="/carrinho" className="mb-4 inline-flex size-10 items-center justify-center rounded-full border border-linha lg:hidden" aria-label="Voltar ao carrinho">
          ←
        </Link>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold lg:text-3xl">
            <span className="lg:hidden">Pagamento com carteira</span>
            <span className="hidden lg:inline">Pagamento</span>
          </h1>
          {conexao ? (
            <button type="button" className="text-sm text-laranja lg:hidden" onClick={() => setConexao(null)}>
              Trocar carteira
            </button>
          ) : null}
        </div>
        <p className="mt-2 hidden text-sm text-mudo lg:block">A compra usa a cotação da API. Nada é enviado para uma rede real.</p>
        {aviso ? (
          <p role="alert" className="mt-4 rounded-xl border border-linha bg-cartao px-4 py-3 text-sm">
            {aviso}
          </p>
        ) : null}
        {mudou ? (
          <div role="status" className="mt-4 rounded-xl border border-laranja/60 bg-cartao px-4 py-3 text-sm">
            <p>
              A cotação mudou de {exibirEth(revisada!.total)} para {exibirEth(atual.data!.total)}. Confirme de novo.
            </p>
            <Botao
              type="button"
              className="mt-3"
              onClick={() => {
                if (atual.data) setRevisada(atual.data);
              }}
            >
              Aceitar nova cotação
            </Botao>
          </div>
        ) : null}
        {!revisada ? (
          <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(revisar)} noValidate>
            <CampoRotulo id="nome" label="Nome" erro={form.formState.errors.nome?.message} registro={form.register("nome")} />
            <CampoRotulo id="email" label="E-mail" type="email" erro={form.formState.errors.email?.message} registro={form.register("email")} />
            <CampoRotulo id="documento" label="Documento" inputMode="numeric" erro={form.formState.errors.documento?.message} registro={form.register("documento")} />
            <label className="block text-sm" htmlFor="carteira">
              <span className="max-lg:sr-only">Carteira</span>
              <select
                id="carteira"
                className="mt-1 w-full rounded-lg border border-linha bg-fundo px-3 py-2.5 max-lg:sr-only"
                aria-invalid={Boolean(form.formState.errors.carteiraId)}
                aria-describedby={form.formState.errors.carteiraId ? "erro-carteira" : undefined}
                {...form.register("carteiraId", { onChange: () => setConexao(null) })}
              >
                <option value="">Selecione</option>
                {(carteiras.data ?? []).map((carteira) => (
                  <option key={carteira.id} value={carteira.id}>
                    {carteira.apelido} · {carteira.endereco.slice(0, 8)}…
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-3 lg:hidden">
              <p className="text-sm font-semibold">Carteira conectada</p>
              {(carteiras.data ?? []).map((carteira) => (
                <button
                  key={carteira.id}
                  type="button"
                  className={`w-full rounded-2xl border p-4 text-left ${carteiraId === carteira.id ? "border-laranja" : "border-linha"}`}
                  onClick={() => {
                    form.setValue("carteiraId", carteira.id, { shouldValidate: true });
                    setConexao(null);
                  }}
                >
                  <span className="block font-semibold">{carteira.apelido}</span>
                  <span className="mt-1 block break-all text-sm text-mudo">{carteira.endereco}</span>
                </button>
              ))}
            </div>
            {atual.data ? (
              <p className="text-right text-sm lg:hidden">
                Total: <span className="font-semibold text-laranja">{exibirEth(atual.data.total)}</span>
              </p>
            ) : null}
            {form.formState.errors.carteiraId ? (
              <span id="erro-carteira" className="block text-sm text-perigo">
                {form.formState.errors.carteiraId.message}
              </span>
            ) : null}
            <fieldset>
              <legend className="text-sm">Rede</legend>
              <div className="mt-2 flex gap-4 text-sm">
                {(["ethereum", "polygon"] as const).map((opcao) => (
                  <label key={opcao} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="rede"
                      checked={rede === opcao}
                      onChange={() => {
                        setRede(opcao);
                        setConexao(null);
                        setRevisada(null);
                      }}
                    />
                    {opcao === "ethereum" ? "Ethereum" : "Polygon"}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex flex-wrap gap-3">
              <Botao type="button" tom="borda" disabled={!carteiraId || conectar.isPending} onClick={() => conectar.mutate()}>
                {conexao ? "Conectada" : "Conectar"}
              </Botao>
              {conexao ? (
                <Botao type="button" tom="fantasma" onClick={() => setConexao(null)}>
                  Desconectar
                </Botao>
              ) : null}
            </div>
            {form.formState.errors.root ? <p className="text-sm text-perigo">{form.formState.errors.root.message}</p> : null}
            {conexao ? <p className="text-sm text-mudo">Conectada em {conexao.endereco}.</p> : null}
            <Botao type="submit">Revisar pedido</Botao>
          </form>
        ) : (
          <div className="mt-6 rounded-2xl border border-linha bg-cartao p-5">
            <h2 className="font-semibold">Revisão</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt>Colecionador</dt>
                <dd>{form.getValues("nome")}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>E-mail</dt>
                <dd>{form.getValues("email")}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Documento</dt>
                <dd>{form.getValues("documento")}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Carteira</dt>
                <dd className="truncate">{conexao?.endereco}</dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-wrap gap-3">
              <Botao type="button" tom="borda" onClick={() => setRevisada(null)}>
                Voltar
              </Botao>
              <Botao type="button" disabled={mudou || enviar.isPending} onClick={() => enviar.mutate(revisada)}>
                {enviar.isPending ? "Enviando" : "Confirmar pedido"}
              </Botao>
            </div>
          </div>
        )}
      </section>
      <Resumo cotacao={revisada ?? atual.data} carregando={atual.isPending} erro={atual.isError} aoTentar={() => atual.refetch()} />
    </div>
  );
}

function CampoRotulo({
  id,
  label,
  erro,
  registro,
  type = "text",
  inputMode,
}: {
  id: string;
  label: string;
  erro?: string;
  registro: ReturnType<ReturnType<typeof useForm>["register"]>;
  type?: string;
  inputMode?: "numeric" | "decimal" | "text";
}) {
  return (
    <label className="block text-sm" htmlFor={id}>
      {label}
      <Campo
        id={id}
        type={type}
        inputMode={inputMode}
        aria-invalid={Boolean(erro)}
        aria-describedby={erro ? `erro-${id}` : undefined}
        {...registro}
      />
      {erro ? (
        <span id={`erro-${id}`} className="mt-1 block text-perigo">
          {erro}
        </span>
      ) : null}
    </label>
  );
}
