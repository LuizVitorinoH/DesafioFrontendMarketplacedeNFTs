import { createFileRoute, stripSearchParams, useNavigate } from "@tanstack/react-router";
import { Inicio, leituraBusca, type Busca } from "@/features/catalogo/inicio";

const padrao: Busca = {
  q: "",
  colecao: [],
  precoMin: "",
  precoMax: "",
  disponivel: "",
  ordenar: "recentes",
  pagina: 1,
};

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): Busca => leituraBusca(search),
  search: { middlewares: [stripSearchParams(padrao)] },
  component: Pagina,
});

function Pagina() {
  const busca = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  return <Inicio busca={busca} aoBuscar={(proxima) => void navigate({ search: proxima, resetScroll: false })} />;
}
