import { createFileRoute } from "@tanstack/react-router";
import { FormularioCadastro } from "@/features/conta/acesso";

export const Route = createFileRoute("/cadastro")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : "",
  }),
  head: () => ({ meta: [{ title: "Criar conta — Kurio" }] }),
  component: Pagina,
});

function Pagina() {
  const { redirect } = Route.useSearch();
  return <FormularioCadastro redirect={redirect} />;
}
