import { createFileRoute, Link } from "@tanstack/react-router";
import { buscaVazia } from "@/features/catalogo/inicio";

export const Route = createFileRoute("/$")({
  component: () => (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-3xl font-semibold">Página não encontrada</h1>
      <Link to="/" search={buscaVazia} className="mt-6 inline-block text-laranja">
        Voltar ao início
      </Link>
    </div>
  ),
});
