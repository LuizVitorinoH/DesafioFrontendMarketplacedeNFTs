import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  atualizarCarteira,
  atualizarPerfil,
  criarCarteira,
  enviarAvatar,
  lerCarteiras,
  lerPerfil,
  mensagemErro,
  sair,
  trocarSenha,
} from "@/shared/api";
import { limparEventos } from "@/shared/eventos";
import { buscaVazia } from "@/features/catalogo/inicio";
import { Botao, Campo } from "@/interface/ui";
import type { Carteira, UsuarioPublico } from "@/shared/contracts";
import { aplicarErros, esquemaCarteira, esquemaPerfil, esquemaSenha } from "@/shared/formularios";

export function PaginaPerfil({ usuarioId }: { usuarioId: string }) {
  const cliente = useQueryClient();
  const navigate = useNavigate();
  const perfil = useQuery({
    queryKey: ["perfil", usuarioId],
    queryFn: ({ signal }) => lerPerfil(signal),
  });

  const sairConta = useMutation({
    mutationFn: sair,
    onSuccess: async () => {
      limparEventos();
      cliente.clear();
      await navigate({ to: "/", search: buscaVazia });
    },
  });

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[16rem_1fr]">
      <MenuConta ativo="dados" aoSair={() => sairConta.mutate()} />
      <div>
        <h1 className="text-2xl font-semibold">Perfil do colecionador</h1>
        {perfil.data ? <FormularioPerfil perfil={perfil.data} /> : <p className="mt-6 text-mudo">Carregando perfil.</p>}
      </div>
    </div>
  );
}

function FormularioPerfil({ perfil }: { perfil: UsuarioPublico }) {
  const cliente = useQueryClient();
  const [aviso, setAviso] = useState("");
  const dadosForm = useForm({
    resolver: zodResolver(esquemaPerfil),
    defaultValues: { nome: perfil.nome, email: perfil.email },
  });
  const senhaForm = useForm({
    resolver: zodResolver(esquemaSenha),
    defaultValues: { atual: "", nova: "" },
  });

  const dados = useMutation({
    mutationFn: (valores: { nome: string; email: string }) => atualizarPerfil(valores),
    onSuccess: (usuario) => {
      cliente.setQueryData(["perfil", usuario.id], usuario);
      void cliente.invalidateQueries({ queryKey: ["sessao"] });
      setAviso("Dados atualizados.");
      dadosForm.clearErrors();
    },
    onError: (falha) => {
      const info = mensagemErro(falha);
      aplicarErros(dadosForm, info.fields);
      setAviso(info.message);
    },
  });
  const avatar = useMutation({
    mutationFn: enviarAvatar,
    onSuccess: (usuario) => {
      cliente.setQueryData(["perfil", usuario.id], usuario);
      void cliente.invalidateQueries({ queryKey: ["sessao"] });
      setAviso("Avatar atualizado.");
    },
    onError: (falha) => setAviso(mensagemErro(falha).message),
  });
  const senha = useMutation({
    mutationFn: (valores: { atual: string; nova: string }) => trocarSenha(valores.atual, valores.nova),
    onSuccess: () => {
      senhaForm.reset();
      setAviso("Senha alterada.");
    },
    onError: (falha) => {
      const info = mensagemErro(falha);
      aplicarErros(senhaForm, info.fields);
      setAviso(info.message);
    },
  });

  const errosDados = dadosForm.formState.errors;
  const errosSenha = senhaForm.formState.errors;

  return (
    <div className="mt-8 space-y-10">
      {aviso ? (
        <p role="status" className="text-sm">
          {aviso}
        </p>
      ) : null}
      <form className="space-y-4" noValidate onSubmit={dadosForm.handleSubmit((valores) => dados.mutate(valores))}>
        <h2 className="text-xl font-semibold">Dados</h2>
        <label className="block text-sm" htmlFor="nome-perfil">
          Nome
          <Campo
            id="nome-perfil"
            aria-invalid={Boolean(errosDados.nome)}
            aria-describedby={errosDados.nome ? "erro-nome-perfil" : undefined}
            {...dadosForm.register("nome")}
          />
          {errosDados.nome ? (
            <span id="erro-nome-perfil" className="text-perigo">
              {errosDados.nome.message}
            </span>
          ) : null}
        </label>
        <label className="block text-sm" htmlFor="email-perfil">
          E-mail
          <Campo
            id="email-perfil"
            type="email"
            aria-invalid={Boolean(errosDados.email)}
            aria-describedby={errosDados.email ? "erro-email-perfil" : undefined}
            {...dadosForm.register("email")}
          />
          {errosDados.email ? (
            <span id="erro-email-perfil" className="text-perigo">
              {errosDados.email.message}
            </span>
          ) : null}
        </label>
        <Botao type="submit">Salvar dados</Botao>
      </form>
      <form
        className="space-y-3"
        onSubmit={(evento) => {
          evento.preventDefault();
          const arquivo = (evento.currentTarget.elements.namedItem("avatar") as HTMLInputElement).files?.[0];
          if (!arquivo) return;
          if (arquivo.size > 400_000) {
            setAviso("A imagem passa de 400 KB.");
            return;
          }
          const leitor = new FileReader();
          leitor.onload = () => avatar.mutate(String(leitor.result));
          leitor.readAsDataURL(arquivo);
        }}
      >
        <h2 className="text-xl font-semibold">Avatar</h2>
        {perfil.avatar ? <img src={perfil.avatar} alt={`Avatar de ${perfil.nome}`} className="size-20 rounded-full object-cover" /> : null}
        <label className="block text-sm" htmlFor="avatar">
          Imagem
          <input id="avatar" name="avatar" type="file" accept="image/*" className="mt-2 block text-sm" />
        </label>
        <Botao type="submit" tom="borda">
          Enviar avatar
        </Botao>
      </form>
      <form className="space-y-4" noValidate onSubmit={senhaForm.handleSubmit((valores) => senha.mutate(valores))}>
        <h2 className="text-xl font-semibold">Senha</h2>
        <label className="block text-sm" htmlFor="senha-atual">
          Senha atual
          <Campo
            id="senha-atual"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errosSenha.atual)}
            aria-describedby={errosSenha.atual ? "erro-senha-atual" : undefined}
            {...senhaForm.register("atual")}
          />
          {errosSenha.atual ? (
            <span id="erro-senha-atual" className="text-perigo">
              {errosSenha.atual.message}
            </span>
          ) : null}
        </label>
        <label className="block text-sm" htmlFor="senha-nova">
          Nova senha
          <Campo
            id="senha-nova"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errosSenha.nova)}
            aria-describedby={errosSenha.nova ? "erro-senha-nova" : undefined}
            {...senhaForm.register("nova")}
          />
          {errosSenha.nova ? (
            <span id="erro-senha-nova" className="text-perigo">
              {errosSenha.nova.message}
            </span>
          ) : null}
        </label>
        <Botao type="submit">Alterar senha</Botao>
      </form>
    </div>
  );
}

export function PaginaCarteiras({ usuarioId }: { usuarioId: string }) {
  const cliente = useQueryClient();
  const carteiras = useQuery({
    queryKey: ["carteiras", usuarioId],
    queryFn: ({ signal }) => lerCarteiras(signal),
  });
  const [editando, setEditando] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
  const form = useForm({
    resolver: zodResolver(esquemaCarteira),
    defaultValues: { apelido: "", endereco: "", principal: false },
  });

  const salvar = useMutation({
    mutationFn: (valores: { apelido: string; endereco: string; principal: boolean }) =>
      editando ? atualizarCarteira(editando, valores) : criarCarteira(valores),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ["carteiras", usuarioId] });
      form.reset({ apelido: "", endereco: "", principal: false });
      setEditando(null);
      setAviso("Carteira salva.");
    },
    onError: (falha) => {
      const info = mensagemErro(falha);
      aplicarErros(form, info.fields);
      setAviso(info.message);
    },
  });

  const lista = carteiras.data ?? [];
  const principais = lista.filter((carteira) => carteira.principal);
  const secundarias = lista.filter((carteira) => !carteira.principal);

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[16rem_1fr]">
      <MenuConta ativo="carteiras" />
      <div>
      <h1 className="text-2xl font-semibold">Carteiras</h1>
      <section className="mt-6">
        <h2 className="font-semibold">Carteira principal</h2>
        <ListaCarteiras itens={principais} aoEditar={(carteira) => {
          setEditando(carteira.id);
          form.reset({ apelido: carteira.apelido, endereco: carteira.endereco, principal: carteira.principal });
        }} />
      </section>
      <section className="mt-8">
        <h2 className="font-semibold">Carteira secundária</h2>
        {secundarias.length === 0 ? <p className="mt-2 text-sm text-mudo">Você ainda não adicionou uma carteira secundária.</p> : null}
        <ListaCarteiras itens={secundarias} aoEditar={(carteira) => {
          setEditando(carteira.id);
          form.reset({ apelido: carteira.apelido, endereco: carteira.endereco, principal: carteira.principal });
        }} />
      </section>
      <form className="mt-8 space-y-4" noValidate onSubmit={form.handleSubmit((valores) => salvar.mutate(valores))}>
        <h2 className="text-xl font-semibold">{editando ? "Editar carteira" : "Nova carteira"}</h2>
        {aviso ? <p role="status">{aviso}</p> : null}
        <label className="block text-sm" htmlFor="apelido">
          Apelido
          <Campo
            id="apelido"
            aria-invalid={Boolean(form.formState.errors.apelido)}
            aria-describedby={form.formState.errors.apelido ? "erro-apelido" : undefined}
            {...form.register("apelido")}
          />
          {form.formState.errors.apelido ? (
            <span id="erro-apelido" className="text-perigo">
              {form.formState.errors.apelido.message}
            </span>
          ) : null}
        </label>
        <label className="block text-sm" htmlFor="endereco">
          Endereço
          <Campo
            id="endereco"
            aria-invalid={Boolean(form.formState.errors.endereco)}
            aria-describedby={form.formState.errors.endereco ? "erro-endereco" : undefined}
            {...form.register("endereco")}
          />
          {form.formState.errors.endereco ? (
            <span id="erro-endereco" className="text-perigo">
              {form.formState.errors.endereco.message}
            </span>
          ) : null}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...form.register("principal")} />
          Principal
        </label>
        <Botao type="submit">{editando ? "Salvar edição" : "Cadastrar carteira"}</Botao>
      </form>
      </div>
    </div>
  );
}

function ListaCarteiras({ itens, aoEditar }: { itens: Carteira[]; aoEditar: (carteira: Carteira) => void }) {
  if (itens.length === 0) return null;
  return (
    <ul className="mt-3 space-y-3">
      {itens.map((carteira) => (
        <li key={carteira.id} className="rounded-2xl border border-linha p-4 text-sm">
          <p className="font-medium">{carteira.apelido}</p>
          <p className="mt-1 break-all text-mudo">{carteira.endereco}</p>
          <button type="button" className="mt-2 underline" onClick={() => aoEditar(carteira)}>
            Editar {carteira.apelido}
          </button>
        </li>
      ))}
    </ul>
  );
}

function MenuConta({ ativo, aoSair }: { ativo: "dados" | "carteiras"; aoSair?: () => void }) {
  const navigate = useNavigate();
  const cliente = useQueryClient();
  const sairConta = useMutation({
    mutationFn: sair,
    onSuccess: async () => {
      limparEventos();
      cliente.clear();
      await navigate({ to: "/", search: buscaVazia });
    },
  });

  return (
    <aside className="h-fit rounded-2xl bg-cartao p-4">
      <p className="font-semibold">Meu perfil</p>
      <nav className="mt-4 flex flex-col gap-2 text-sm" aria-label="Conta">
        <Link to="/conta" className={ativo === "dados" ? "text-laranja" : "text-mudo"}>
          Dados do perfil
        </Link>
        <Link to="/conta/carteiras" className={ativo === "carteiras" ? "text-laranja" : "text-mudo"}>
          Carteiras
        </Link>
        <button type="button" className="text-left text-mudo" onClick={() => (aoSair ? aoSair() : sairConta.mutate())}>
          Sair
        </button>
      </nav>
    </aside>
  );
}
