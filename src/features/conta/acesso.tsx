import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { buscaVazia } from "@/features/catalogo/inicio";
import { cadastrar, entrar, mensagemErro } from "@/shared/api";
import { aplicarErros, esquemaCadastro, esquemaEntrar } from "@/shared/formularios";
import { Botao, Campo } from "@/interface/ui";

function seguir(navigate: ReturnType<typeof useNavigate>, redirect: string) {
  if (redirect.startsWith("/") && redirect !== "/") {
    return navigate({ href: redirect });
  }
  return navigate({ to: "/", search: buscaVazia });
}

export function FormularioEntrar({ redirect }: { redirect: string }) {
  const navigate = useNavigate();
  const cliente = useQueryClient();
  const form = useForm({
    resolver: zodResolver(esquemaEntrar),
    defaultValues: { email: "", senha: "" },
  });
  const mutacao = useMutation({
    mutationFn: (valores: { email: string; senha: string }) => entrar(valores.email, valores.senha),
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: ["sessao"] });
      void cliente.invalidateQueries({ queryKey: ["carrinho"] });
      void seguir(navigate, redirect);
    },
    onError: (falha) => form.setError("root", { message: mensagemErro(falha).message }),
  });

  return (
    <form
      className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-6 py-16"
      onSubmit={form.handleSubmit((valores) => mutacao.mutate(valores))}
      noValidate
    >
      <p className="text-center text-2xl font-semibold tracking-[0.18em]">KURIO</p>
      <h1 className="text-center text-lg font-semibold">Entrar</h1>
      <label className="block text-sm" htmlFor="email-login">
        <span className="sr-only">E-mail</span>
        <Campo id="email-login" type="email" autoComplete="email" placeholder="Digite seu e-mail" className="rounded-xl py-3" {...form.register("email")} />
      </label>
      <label className="block text-sm" htmlFor="senha-login">
        <span className="sr-only">Senha</span>
        <Campo id="senha-login" type="password" autoComplete="current-password" placeholder="Senha" className="rounded-xl py-3" {...form.register("senha")} />
      </label>
      {form.formState.errors.root ? (
        <p role="alert" className="text-sm text-perigo">
          {form.formState.errors.root.message}
        </p>
      ) : null}
      <Botao type="submit" className="w-full rounded-xl py-3" disabled={mutacao.isPending}>
        Entrar
      </Botao>
      <p className="text-center text-sm text-mudo">
        Novo na Kurio?{" "}
        <Link to="/cadastro" search={{ redirect }} className="text-laranja">
          Criar conta
        </Link>
      </p>
    </form>
  );
}

export function FormularioCadastro({ redirect }: { redirect: string }) {
  const navigate = useNavigate();
  const cliente = useQueryClient();
  const form = useForm({
    resolver: zodResolver(esquemaCadastro),
    defaultValues: { nome: "", email: "", senha: "", confirma: "" },
  });
  const mutacao = useMutation({
    mutationFn: (valores: { nome: string; email: string; senha: string }) => cadastrar(valores.nome, valores.email, valores.senha),
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: ["sessao"] });
      void cliente.invalidateQueries({ queryKey: ["carrinho"] });
      void seguir(navigate, redirect);
    },
    onError: (falha) => {
      const info = mensagemErro(falha);
      aplicarErros(form, info.fields);
      form.setError("root", { message: info.message });
    },
  });

  const erros = form.formState.errors;

  return (
    <form
      className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-6 py-16"
      noValidate
      onSubmit={form.handleSubmit((valores) => mutacao.mutate(valores))}
    >
      <p className="text-center text-2xl font-semibold tracking-[0.18em]">KURIO</p>
      <h1 className="text-center text-lg font-semibold">Criar perfil de colecionador</h1>
      <CampoComErro id="nome" label="Nome" placeholder="Nome de usuário" erro={erros.nome?.message} autoComplete="name" registro={form.register("nome")} />
      <CampoComErro id="email" label="E-mail" type="email" placeholder="Digite seu e-mail" erro={erros.email?.message} autoComplete="email" registro={form.register("email")} />
      <CampoComErro id="senha" label="Senha" type="password" placeholder="Senha" erro={erros.senha?.message} autoComplete="new-password" registro={form.register("senha")} />
      <CampoComErro id="confirma" label="Confirmar senha" type="password" placeholder="Confirmar senha" erro={erros.confirma?.message} autoComplete="new-password" registro={form.register("confirma")} />
      {erros.root?.message ? (
        <p role="alert" className="text-sm text-perigo">
          {erros.root.message}
        </p>
      ) : null}
      <Botao type="submit" className="w-full rounded-xl py-3" aria-label="Criar conta" disabled={mutacao.isPending}>
        <span className="md:hidden">Criar perfil</span>
        <span className="hidden md:inline">Criar conta</span>
      </Botao>
      <p className="text-center text-sm text-mudo">
        Já tem uma conta?{" "}
        <Link to="/entrar" search={{ redirect }} className="text-laranja">
          Entrar
        </Link>
      </p>
    </form>
  );
}

function CampoComErro({
  id,
  label,
  erro,
  type = "text",
  autoComplete,
  placeholder,
  registro,
}: {
  id: string;
  label: string;
  erro?: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  registro: ReturnType<ReturnType<typeof useForm>["register"]>;
}) {
  return (
    <label className="block text-sm" htmlFor={id}>
      <span className="sr-only">{label}</span>
      <Campo
        id={id}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder ?? label}
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
