import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Menu, Search, ShoppingBag, UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { lerCarrinho } from "@/shared/api";
import { idVisitante } from "@/shared/api";
import { ouvirAnuncio } from "@/shared/eventos";
import { buscaVazia } from "@/features/catalogo/inicio";
import { Botao, CaixaDialogo } from "@/interface/ui";
import type { UsuarioPublico } from "@/shared/contracts";

export function Casco({ usuario, children }: { usuario: UsuarioPublico | null; children: ReactNode }) {
  const caminho = useRouterState({ select: (estado) => estado.location.pathname });
  const acesso = caminho === "/entrar" || caminho === "/cadastro";
  const comBarra = !acesso && !caminho.startsWith("/nfts") && caminho !== "/carrinho" && caminho !== "/pagamento";
  const noMercado = caminho.startsWith("/nfts") || caminho === "/carrinho" || caminho === "/pagamento";
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const [aviso, setAviso] = useState("");
  const dono = usuario?.id ?? idVisitante();
  const carrinho = useQuery({
    queryKey: ["carrinho", dono],
    queryFn: ({ signal }) => lerCarrinho(signal),
  });
  const quantidade = carrinho.data?.itens.reduce((total, item) => total + item.quantidade, 0) ?? 0;

  useEffect(() => ouvirAnuncio(setAviso), []);

  return (
    <div className="min-h-screen">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-laranja focus:px-3 focus:py-2">
        Ir para o conteúdo
      </a>
      <p className="sr-only" aria-live="polite">
        {aviso}
      </p>
      {acesso ? null : (
      <>
      <header className="sticky top-0 z-30 hidden border-b border-linha bg-fundo/95 backdrop-blur md:block">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link to="/" search={buscaVazia} className="text-sm font-semibold tracking-[0.18em]">
            KURIO
          </Link>
          <nav className="hidden items-center gap-6 text-sm md:flex" aria-label="Principal">
            <Link
              to="/"
              search={buscaVazia}
              className={caminho === "/" ? "border-b-2 border-laranja pb-1 text-laranja" : "text-mudo hover:text-texto"}
            >
              Início
            </Link>
            <a href="/#catalogo" className={noMercado ? "border-b-2 border-laranja pb-1 text-laranja" : "text-mudo hover:text-texto"}>
              Mercado
            </a>
          </nav>
          <form action="/" role="search" className="ml-auto hidden min-w-0 flex-1 md:block md:max-w-xs">
            <label className="sr-only" htmlFor="busca-cabecalho">
              Buscar coleções
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-mudo" aria-hidden />
              <input
                id="busca-cabecalho"
                name="q"
                placeholder="Buscar coleções"
                className="w-full rounded-lg border border-linha bg-elevado py-2 pr-3 pl-9 text-sm"
              />
            </div>
          </form>
          <Link to="/carrinho" className="relative ml-auto rounded-lg p-2 md:ml-0" aria-label={`Carrinho, ${quantidade} itens`}>
            <ShoppingBag className="size-5" aria-hidden />
            {quantidade > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-5 rounded-full bg-laranja px-1 text-center text-xs font-semibold text-[#1a1008]">
                {quantidade}
              </span>
            ) : null}
          </Link>
          {usuario ? (
            <Link to="/conta" className="hidden text-sm md:inline">
              {usuario.nome.split(" ")[0]}
            </Link>
          ) : (
            <Botao asChild className="hidden md:inline-flex">
              <Link to="/entrar" search={{ redirect: "" }}>
                Entrar
              </Link>
            </Botao>
          )}
        </div>
      </header>
      <nav className={`fixed inset-x-0 bottom-0 z-30 items-center justify-between border-t border-linha bg-fundo px-6 py-3 md:hidden ${comBarra ? "flex" : "hidden"}`} aria-label="Móvel">
        <Link to="/" search={buscaVazia} className={caminho === "/" ? "text-laranja" : "text-mudo"} aria-label="Início">
          <Home className="size-5" aria-hidden />
        </Link>
        <button ref={menuRef} type="button" className="text-mudo" aria-label="Abrir menu" onClick={() => setMenu(true)}>
          <Menu className="size-5" aria-hidden />
        </button>
        <Link to="/carrinho" className="relative text-mudo" aria-label={`Carrinho, ${quantidade} itens`}>
          <ShoppingBag className="size-5" aria-hidden />
          {quantidade > 0 ? (
            <span className="absolute -top-2 -right-2 min-w-4 rounded-full bg-laranja px-1 text-center text-[10px] font-semibold text-[#1a1008]">
              {quantidade}
            </span>
          ) : null}
        </Link>
        {usuario ? (
          <Link to="/conta" className="text-mudo" aria-label="Conta">
            <UserRound className="size-5" aria-hidden />
          </Link>
        ) : (
          <Link to="/entrar" search={{ redirect: "" }} className="text-mudo" aria-label="Entrar">
            <UserRound className="size-5" aria-hidden />
          </Link>
        )}
      </nav>
      <CaixaDialogo
        aberto={menu}
        aoFechar={() => {
          setMenu(false);
          window.setTimeout(() => menuRef.current?.focus(), 50);
        }}
        titulo="Menu"
      >
        <nav className="flex flex-col gap-3 text-sm" aria-label="Menu móvel">
          <Link to="/" search={buscaVazia} onClick={() => setMenu(false)}>
            Início
          </Link>
          <a href="/#catalogo" onClick={() => setMenu(false)}>
            Mercado
          </a>
          <Link to="/carrinho" onClick={() => setMenu(false)}>
            Carrinho
          </Link>
          {usuario ? (
            <Link to="/conta" onClick={() => setMenu(false)}>
              Conta
            </Link>
          ) : (
            <Link to="/entrar" search={{ redirect: "" }} onClick={() => setMenu(false)}>
              Entrar
            </Link>
          )}
        </nav>
      </CaixaDialogo>
      </>
      )}
      <main id="conteudo" className={comBarra ? "pb-20 md:pb-0" : undefined}>
        {children}
      </main>
      {acesso ? null : (
        <footer className="mt-16 hidden border-t border-linha md:block">
          <p className="py-8 text-center text-xs text-mudo">© 2026 Kurio</p>
        </footer>
      )}
    </div>
  );
}
