import { createFileRoute } from "@tanstack/react-router";
import { FormularioEntrar } from "@/features/conta/acesso";

export const Route = createFileRoute("/entrar")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : "",
  }),
  head: () => ({ meta: [{ title: "Entrar — Kurio" }] }),
  component: Pagina,
});

function Pagina() {
  const { redirect } = Route.useSearch();
  return <FormularioEntrar redirect={redirect} />;
}
