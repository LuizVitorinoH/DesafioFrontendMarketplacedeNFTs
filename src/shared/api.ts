import axios from "axios";
import type {
  Carrinho,
  Carteira,
  ConsultaNfts,
  CorpoPedido,
  Cotacao,
  Nft,
  PaginaNfts,
  Pedido,
  Rede,
  Sessao,
  UsuarioPublico,
} from "@/shared/contracts";

const CHAVE_SESSAO = "lume.sessao";
const CHAVE_VISITANTE = "lume.visitante";

export function tokenSessao() {
  return localStorage.getItem(CHAVE_SESSAO);
}

export function guardarSessao(token: string | null) {
  if (token) localStorage.setItem(CHAVE_SESSAO, token);
  else localStorage.removeItem(CHAVE_SESSAO);
}

export function idVisitante() {
  let id = localStorage.getItem(CHAVE_VISITANTE);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CHAVE_VISITANTE, id);
  }
  return id;
}

export function girarVisitante() {
  const id = crypto.randomUUID();
  localStorage.setItem(CHAVE_VISITANTE, id);
  return id;
}

export const http = axios.create({
  baseURL: "/api",
  timeout: 8000,
  paramsSerializer: { indexes: null },
});

http.interceptors.request.use((config) => {
  const token = tokenSessao();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers["X-Visitante"] = idVisitante();
  const cenario = localStorage.getItem("lume.cenario");
  if (cenario) config.headers["X-Cenario"] = cenario;
  return config;
});

http.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    if (axios.isAxiosError(erro) && erro.response?.status === 401) {
      const url = erro.config?.url ?? "";
      guardarSessao(null);
      if (!url.includes("/auth/session") && !url.includes("/auth/login") && !url.includes("/auth/register")) {
        window.dispatchEvent(new CustomEvent("lume:sessao-expirada"));
      }
    }
    return Promise.reject(erro);
  },
);

export function mensagemErro(erro: unknown) {
  if (axios.isAxiosError(erro)) {
    const data = erro.response?.data as { message?: string; fields?: Record<string, string> } | undefined;
    return {
      message: data?.message ?? (erro.response ? "Não foi possível concluir." : "A conexão falhou."),
      fields: data?.fields ?? {},
      status: erro.response?.status ?? 0,
      code: (erro.response?.data as { code?: string } | undefined)?.code ?? "",
    };
  }
  return { message: "A conexão falhou.", fields: {}, status: 0, code: "" };
}

export async function entrar(email: string, senha: string) {
  const { data } = await http.post<Sessao>("/auth/login", { email, senha });
  guardarSessao(data.token);
  return data.usuario;
}

export async function cadastrar(nome: string, email: string, senha: string) {
  const { data } = await http.post<Sessao>("/auth/register", { nome, email, senha });
  guardarSessao(data.token);
  return data.usuario;
}

export async function sair() {
  await http.post("/auth/logout").catch(() => undefined);
  guardarSessao(null);
  girarVisitante();
}

export async function lerSessao() {
  if (!tokenSessao()) return null;
  try {
    const { data } = await http.get<{ usuario: UsuarioPublico | null }>("/auth/session");
    return data.usuario;
  } catch (erro) {
    if (axios.isAxiosError(erro) && erro.response?.status === 401) return null;
    throw erro;
  }
}

export async function listarNfts(consulta: ConsultaNfts, signal?: AbortSignal) {
  const { data } = await http.get<PaginaNfts>("/nfts", {
    signal,
    params: {
      q: consulta.q || undefined,
      colecao: consulta.colecao,
      precoMin: consulta.precoMin || undefined,
      precoMax: consulta.precoMax || undefined,
      disponivel: consulta.disponivel === undefined ? undefined : consulta.disponivel ? "1" : "0",
      ordenar: consulta.ordenar,
      pagina: consulta.pagina,
      limite: consulta.limite,
    },
  });
  return data;
}

export async function lerNft(id: string, signal?: AbortSignal) {
  const { data } = await http.get<Nft>(`/nfts/${id}`, { signal });
  return data;
}

export async function lerFavoritos(signal?: AbortSignal) {
  const { data } = await http.get<{ itens: Nft[] }>("/favorites", { signal });
  return data.itens;
}

export async function favoritar(nftId: string) {
  await http.post("/favorites", { nftId });
}

export async function desfavoritar(nftId: string) {
  await http.delete(`/favorites/${nftId}`);
}

export async function lerCarrinho(signal?: AbortSignal) {
  const { data } = await http.get<Carrinho>("/cart/items", { signal });
  return data;
}

export async function adicionarItem(nftId: string, edicao: number, quantidade: number) {
  const { data } = await http.post<Carrinho>("/cart/items", { nftId, edicao, quantidade });
  return data;
}

export async function alterarQuantidade(id: string, quantidade: number) {
  await http.patch(`/cart/items/${id}`, { quantidade });
}

export async function removerItem(id: string) {
  await http.delete(`/cart/items/${id}`);
}

export async function cotar(opcoes: { cupom?: string | null; rede: Rede; manterCupom?: boolean }) {
  const { data } = await http.post<Cotacao>("/quotes", opcoes);
  return data;
}

export async function criarPedido(corpo: CorpoPedido, chave: string) {
  const enviar = () => http.post<Pedido>("/orders", corpo, { headers: { "Idempotency-Key": chave } });
  try {
    const { data } = await enviar();
    return data;
  } catch (erro) {
    if (axios.isAxiosError(erro) && !erro.response) {
      const { data } = await enviar();
      return data;
    }
    throw erro;
  }
}

export async function lerPedido(id: string, signal?: AbortSignal) {
  const { data } = await http.get<Pedido>(`/orders/${id}`, { signal });
  return data;
}

export async function lerPerfil(signal?: AbortSignal) {
  const { data } = await http.get<UsuarioPublico>("/profile", { signal });
  return data;
}

export async function atualizarPerfil(corpo: { nome: string; email: string }) {
  const { data } = await http.patch<UsuarioPublico>("/profile", corpo);
  return data;
}

export async function enviarAvatar(avatar: string) {
  const { data } = await http.post<UsuarioPublico>("/profile/avatar", { avatar });
  return data;
}

export async function trocarSenha(atual: string, nova: string) {
  await http.post("/profile/password", { atual, nova });
}

export async function lerCarteiras(signal?: AbortSignal) {
  const { data } = await http.get<{ itens: Carteira[] }>("/wallets", { signal });
  return data.itens;
}

export async function criarCarteira(corpo: { apelido: string; endereco: string; principal: boolean }) {
  const { data } = await http.post<Carteira>("/wallets", corpo);
  return data;
}

export async function atualizarCarteira(id: string, corpo: { apelido: string; endereco: string; principal: boolean }) {
  const { data } = await http.patch<Carteira>(`/wallets/${id}`, corpo);
  return data;
}

export async function conectarCarteira(id: string, rede: Rede) {
  const { data } = await http.post<{ conectada: boolean; endereco: string; rede: Rede }>(
    `/wallets/${id}/connection`,
    { rede },
  );
  return data;
}
