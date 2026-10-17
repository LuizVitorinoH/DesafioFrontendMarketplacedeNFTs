import { createFileRoute, Link } from "@tanstack/react-router";
import { buscaVazia } from "@/features/catalogo/inicio";

export const Route = createFileRoute("/rede/$tx")({
  component: Pagina,
});

function Pagina() {
  const { tx } = Route.useParams();
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-3xl font-semibold">Explorador simulado</h1>
      <p className="mt-3 break-all text-sm text-mudo">{tx}</p>
      <p className="mt-4 text-mudo">Esta referência não consulta uma rede pública.</p>
      <Link to="/" search={buscaVazia} className="mt-6 inline-block text-laranja">
        Voltar ao início
      </Link>
    </div>
  );
}
