import { redirect } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { lerSessao } from "@/shared/api";

export async function exigirSessao(queryClient: QueryClient, href: string) {
  const usuario = await queryClient.fetchQuery({
    queryKey: ["sessao"],
    queryFn: lerSessao,
    staleTime: 0,
  });
  if (!usuario) throw redirect({ to: "/entrar", search: { redirect: href } });
  return { usuario };
}
