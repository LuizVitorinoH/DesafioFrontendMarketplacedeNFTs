import { http, HttpResponse, delay, type HttpHandler } from "msw";
import type { CorpoPedido, Rede } from "@/shared/contracts";
import { dinheiro } from "@/shared/money";
import {
  baixarEstoque,
  carregar,
  edicaoDe,
  gravar,
  linhaCarrinho,
  montarCotacao,
  nftPorId,
  proximoId,
  publicarPedido,
  reservado,
  tirarDoCarrinho,
  type Estado,
  type PedidoGuardado,
} from "@/mocks/store";
import { emitirPedido, emitirNft } from "@/mocks/realtime";

const ENDERECO = /^0x[a-fA-F0-9]{40}$/;

type SessaoAtual = { usuarioId: string } | null;

function cenarioDe(request: Request) {
  const header = request.headers.get("x-cenario");
  if (header) return header;
  const cookie = request.headers.get("cookie") ?? "";
  const todos = [...cookie.matchAll(/(?:^|; )cenario=([^;]+)/g)];
  const ultimo = todos.at(-1);
  return ultimo ? decodeURIComponent(ultimo[1]) : "padrao";
}

function erro(status: number, code: string, message: string, fields?: Record<string, string>) {
  return HttpResponse.json({ code, message, fields }, { status });
}

async function pausa(cenario: string, request: Request) {
  if (cenario === "offline") return "offline" as const;
  if (cenario === "lento") await delay(1800);
  if (cenario === "variavel") {
    const q = new URL(request.url).searchParams.get("q") ?? "";
    await delay(q.length >= 4 ? 1400 : 40);
  }
  if (cenario === "erro" && new URL(request.url).pathname.endsWith("/nfts")) {
    return "erro" as const;
  }
  return "ok" as const;
}

function usuarioDaSessao(estado: Estado, request: Request, cenario: string): SessaoAtual | "expirada" {
  const header = request.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  if (!token || token === header) return null;
  if (cenario === "sessao-expirada") return "expirada";
  const sessao = estado.sessoes[token];
  if (!sessao || sessao.expiraEm <= Date.now()) return "expirada";
  return { usuarioId: sessao.usuarioId };
}

function donoDe(estado: Estado, request: Request, cenario: string) {
  const sessao = usuarioDaSessao(estado, request, cenario);
  if (sessao === "expirada") return "expirada" as const;
  if (sessao) return sessao.usuarioId;
  const visitante = request.headers.get("x-visitante");
  if (!visitante) return "anon" as const;
  return `visitante:${visitante}`;
}

async function hashSenha(senha: string) {
  const bytes = new TextEncoder().encode(senha);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function publico(usuario: Estado["usuarios"][number]) {
  return { id: usuario.id, nome: usuario.nome, email: usuario.email, avatar: usuario.avatar };
}

function abrirSessao(estado: Estado, usuarioId: string) {
  const token = crypto.randomUUID();
  estado.sessoes[token] = { usuarioId, expiraEm: Date.now() + 1000 * 60 * 60 * 8 };
  return token;
}

function fundirCarrinho(estado: Estado, visitante: string | null, usuarioId: string) {
  if (!visitante) return;
  const origem = `visitante:${visitante}`;
  const itens = estado.carrinhos.filter((item) => item.dono === origem);
  for (const item of itens) {
    const nft = nftPorId(estado, item.nftId);
    const edicao = nft && edicaoDe(nft, item.edicao);
    if (!nft || !edicao) continue;
    const destino = estado.carrinhos.find(
      (atual) => atual.dono === usuarioId && atual.nftId === item.nftId && atual.edicao === item.edicao,
    );
    const ja = destino?.quantidade ?? 0;
    const cabe = Math.max(0, edicao.restante - ja);
    const quantidade = Math.min(item.quantidade, cabe);
    if (quantidade <= 0) continue;
    if (destino) destino.quantidade += quantidade;
    else {
      estado.carrinhos.push({
        id: proximoId(estado, "item"),
        dono: usuarioId,
        nftId: item.nftId,
        edicao: item.edicao,
        quantidade,
      });
    }
  }
  estado.carrinhos = estado.carrinhos.filter((item) => item.dono !== origem);
  const cupom = estado.cupomPorDono[origem];
  if (cupom && !estado.cupomPorDono[usuarioId]) estado.cupomPorDono[usuarioId] = cupom;
  delete estado.cupomPorDono[origem];
}

function listar(estado: Estado, url: URL) {
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const colecoes = url.searchParams.getAll("colecao");
  const precoMin = url.searchParams.get("precoMin");
  const precoMax = url.searchParams.get("precoMax");
  const disponivel = url.searchParams.get("disponivel");
  const ordenar = url.searchParams.get("ordenar") ?? "recentes";
  const pagina = Math.max(1, Number(url.searchParams.get("pagina") ?? 1) || 1);
  const limite = Math.min(24, Math.max(1, Number(url.searchParams.get("limite") ?? 9) || 9));

  let itens = estado.nfts.filter((nft) => {
    const textoBusca = `${nft.nome} ${nft.artista} ${nft.colecao}`.toLowerCase();
    if (q && !textoBusca.includes(q)) return false;
    if (colecoes.length > 0 && !colecoes.includes(nft.colecao)) return false;
    if (precoMin && dinheiro(nft.preco).lessThan(precoMin)) return false;
    if (precoMax && dinheiro(nft.preco).greaterThan(precoMax)) return false;
    const tem = nft.edicoes.some((edicao) => edicao.restante > 0);
    if (disponivel === "1" && !tem) return false;
    if (disponivel === "0" && tem) return false;
    return true;
  });

  itens = [...itens].sort((a, b) => {
    if (ordenar === "preco-asc") return dinheiro(a.preco).comparedTo(b.preco);
    if (ordenar === "preco-desc") return dinheiro(b.preco).comparedTo(a.preco);
    if (ordenar === "nome") return a.nome.localeCompare(b.nome, "pt-BR");
    return a.id.localeCompare(b.id);
  });

  const total = itens.length;
  const inicio = (pagina - 1) * limite;
  return { itens: itens.slice(inicio, inicio + limite), total, pagina, limite };
}

function agendarStatus(_estado: Estado, pedido: PedidoGuardado, cenario: string) {
  if (cenario === "pedido-pendente" || cenario === "timeout-pedido") return;
  const status = cenario === "pagamento-recusado" ? "declined" : "confirmed";
  window.setTimeout(() => {
    const atual = carregar();
    const alvo = atual.pedidos.find((item) => item.id === pedido.id);
    if (!alvo) return;
    const mudou = publicarPedido(alvo, status);
    if (!mudou) return;
    if (status === "confirmed") {
      baixarEstoque(atual, alvo);
      tirarDoCarrinho(atual, alvo.usuarioId, alvo);
    }
    gravar(atual);
    emitirPedido(alvo);
    for (const linha of alvo.recibo.itens) {
      const nft = nftPorId(atual, linha.nftId);
      if (nft) emitirNft(nft);
    }
  }, 700);
}

async function criarPedido(estado: Estado, usuarioId: string, corpo: CorpoPedido, chave: string, cenario: string) {
  const hash = JSON.stringify(corpo);
  const existente = estado.pedidos.find((pedido) => pedido.chave === chave);
  if (existente) {
    if (existente.corpoHash !== hash) {
      return erro(409, "idempotencia", "Esta chave já foi usada com outro pedido.");
    }
    return HttpResponse.json(existente);
  }

  const carteira = estado.carteiras.find((item) => item.id === corpo.carteiraId && item.usuarioId === usuarioId);
  if (!carteira) return erro(422, "validacao", "Escolha uma carteira.", { carteiraId: "Carteira inválida." });

  const campos: Record<string, string> = {};
  if (corpo.nome.trim().length < 2) campos.nome = "Informe o nome.";
  if (!corpo.email.includes("@")) campos.email = "E-mail inválido.";
  if (!/^\d{11}$/.test(corpo.documento)) campos.documento = "Use 11 números.";
  if (Object.keys(campos).length) return erro(422, "validacao", "Revise os campos.", campos);

  const resultado = montarCotacao(estado, {
    dono: usuarioId,
    cupom: estado.cupomPorDono[usuarioId] ?? null,
    rede: corpo.rede,
    agora: Date.now(),
  });
  if (resultado.erro?.code === "estoque") return erro(409, "estoque", resultado.erro.message);
  if (resultado.erro) return erro(422, resultado.erro.code, resultado.erro.message);
  const cotacao = resultado.cotacao!;
  if (cotacao.id !== corpo.cotacaoId || cotacao.versao !== corpo.cotacaoVersao) {
    return erro(409, "cotacao_desatualizada", "A cotação mudou. Confirme de novo.");
  }

  if (cenario === "edicao-esgotada") {
    return erro(409, "estoque", "A edição esgotou durante a compra.");
  }

  const pedido: PedidoGuardado = {
    id: proximoId(estado, "ped"),
    usuarioId,
    status: "pending",
    versao: 1,
    transacao: `0x${crypto.randomUUID().replace(/-/g, "")}aaaa`,
    chave,
    corpoHash: hash,
    criadoEm: new Date().toISOString(),
    recibo: {
      itens: cotacao.itens,
      subtotal: cotacao.subtotal,
      desconto: cotacao.desconto,
      taxa: cotacao.taxa,
      total: cotacao.total,
      cupom: cotacao.cupom,
      rede: cotacao.rede,
      carteira: carteira.endereco,
    },
  };
  estado.pedidos.push(pedido);
  gravar(estado);
  agendarStatus(estado, pedido, cenario);

  if (cenario === "timeout-pedido") await delay(20000);
  return HttpResponse.json(pedido, { status: 201 });
}

export const handlers: HttpHandler[] = [
  http.post("/api/auth/register", async ({ request }) => {
    const cenario = cenarioDe(request);
    const rede = await pausa(cenario, request);
    if (rede === "offline") return HttpResponse.error();
    const estado = carregar();
    const corpo = (await request.json()) as { nome: string; email: string; senha: string };
    const fields: Record<string, string> = {};
    if (!corpo.nome || corpo.nome.trim().length < 2) fields.nome = "Informe o nome.";
    if (!corpo.email?.includes("@")) fields.email = "E-mail inválido.";
    if (!corpo.senha || corpo.senha.length < 8) fields.senha = "Mínimo de 8 caracteres.";
    if (Object.keys(fields).length) return erro(422, "validacao", "Revise os campos.", fields);
    if (cenario === "conflito-cadastro" || estado.usuarios.some((usuario) => usuario.email === corpo.email.toLowerCase())) {
      return erro(409, "email_em_uso", "Já existe uma conta com este e-mail.");
    }
    const usuario = {
      id: proximoId(estado, "usr"),
      nome: corpo.nome.trim(),
      email: corpo.email.toLowerCase(),
      avatar: null,
      senhaHash: await hashSenha(corpo.senha),
    };
    estado.usuarios.push(usuario);
    estado.favoritos[usuario.id] = [];
    const token = abrirSessao(estado, usuario.id);
    const visitante = request.headers.get("x-visitante");
    fundirCarrinho(estado, visitante, usuario.id);
    gravar(estado);
    return HttpResponse.json({ token, usuario: publico(usuario) }, { status: 201 });
  }),

  http.post("/api/auth/login", async ({ request }) => {
    const cenario = cenarioDe(request);
    if (cenario === "offline") return HttpResponse.error();
    const estado = carregar();
    const corpo = (await request.json()) as { email: string; senha: string };
    const usuario = estado.usuarios.find((item) => item.email === corpo.email?.toLowerCase());
    const senha = await hashSenha(corpo.senha ?? "");
    if (!usuario || usuario.senhaHash !== senha) {
      return erro(401, "credenciais", "E-mail ou senha não conferem.");
    }
    const token = abrirSessao(estado, usuario.id);
    fundirCarrinho(estado, request.headers.get("x-visitante"), usuario.id);
    gravar(estado);
    return HttpResponse.json({ token, usuario: publico(usuario) });
  }),

  http.get("/api/auth/session", ({ request }) => {
    const estado = carregar();
    const cenario = cenarioDe(request);
    const sessao = usuarioDaSessao(estado, request, cenario);
    if (sessao === "expirada") return erro(401, "sessao_expirada", "A sessão expirou.");
    if (!sessao) return HttpResponse.json({ usuario: null });
    const usuario = estado.usuarios.find((item) => item.id === sessao.usuarioId);
    if (!usuario) return erro(401, "sessao_expirada", "A sessão expirou.");
    return HttpResponse.json({ usuario: publico(usuario) });
  }),

  http.post("/api/auth/logout", ({ request }) => {
    const estado = carregar();
    const header = request.headers.get("authorization") ?? "";
    const token = header.replace(/^Bearer\s+/i, "");
    delete estado.sessoes[token];
    gravar(estado);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/nfts", async ({ request }) => {
    const cenario = cenarioDe(request);
    const rede = await pausa(cenario, request);
    if (rede === "offline") return HttpResponse.error();
    if (rede === "erro" || cenario === "erro") return erro(503, "indisponivel", "Não foi possível carregar o catálogo.");
    if (cenario === "vazio") return HttpResponse.json({ itens: [], total: 0, pagina: 1, limite: 9 });
    const estado = carregar();
    return HttpResponse.json(listar(estado, new URL(request.url)));
  }),

  http.get("/api/nfts/:id", async ({ request, params }) => {
    const cenario = cenarioDe(request);
    const rede = await pausa(cenario, request);
    if (rede === "offline") return HttpResponse.error();
    const estado = carregar();
    const nft = nftPorId(estado, String(params.id));
    if (!nft) return erro(404, "nao_encontrado", "Obra não encontrada.");
    return HttpResponse.json(nft);
  }),

  http.get("/api/favorites", ({ request }) => {
    const estado = carregar();
    const sessao = usuarioDaSessao(estado, request, cenarioDe(request));
    if (sessao === "expirada") return erro(401, "sessao_expirada", "A sessão expirou.");
    if (!sessao) return erro(401, "sessao_expirada", "Entre para ver os favoritos.");
    const ids = estado.favoritos[sessao.usuarioId] ?? [];
    const itens = ids.map((id) => nftPorId(estado, id)).filter((nft) => nft !== undefined);
    return HttpResponse.json({ itens });
  }),

  http.post("/api/favorites", async ({ request }) => {
    const estado = carregar();
    const cenario = cenarioDe(request);
    const sessao = usuarioDaSessao(estado, request, cenario);
    if (sessao === "expirada" || !sessao) return erro(401, "sessao_expirada", "Entre para favoritar.");
    if (cenario === "favorito-falha") return erro(503, "indisponivel", "Não foi possível salvar o favorito.");
    const corpo = (await request.json()) as { nftId: string };
    if (!nftPorId(estado, corpo.nftId)) return erro(404, "nao_encontrado", "Obra não encontrada.");
    const lista = estado.favoritos[sessao.usuarioId] ?? [];
    if (!lista.includes(corpo.nftId)) lista.push(corpo.nftId);
    estado.favoritos[sessao.usuarioId] = lista;
    gravar(estado);
    return HttpResponse.json({ itens: lista }, { status: 201 });
  }),

  http.delete("/api/favorites/:id", ({ request, params }) => {
    const estado = carregar();
    const cenario = cenarioDe(request);
    const sessao = usuarioDaSessao(estado, request, cenario);
    if (sessao === "expirada" || !sessao) return erro(401, "sessao_expirada", "Entre para alterar favoritos.");
    if (cenario === "favorito-falha") return erro(503, "indisponivel", "Não foi possível remover o favorito.");
    const lista = (estado.favoritos[sessao.usuarioId] ?? []).filter((id) => id !== params.id);
    estado.favoritos[sessao.usuarioId] = lista;
    gravar(estado);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/cart/items", ({ request }) => {
    const estado = carregar();
    const dono = donoDe(estado, request, cenarioDe(request));
    if (dono === "expirada") return erro(401, "sessao_expirada", "A sessão expirou.");
    const itens = estado.carrinhos
      .filter((item) => item.dono === dono)
      .map((item) => linhaCarrinho(estado, item))
      .filter((item) => item !== null);
    return HttpResponse.json({ itens });
  }),

  http.post("/api/cart/items", async ({ request }) => {
    const estado = carregar();
    const dono = donoDe(estado, request, cenarioDe(request));
    if (dono === "expirada") return erro(401, "sessao_expirada", "A sessão expirou.");
    const corpo = (await request.json()) as { nftId: string; edicao: number; quantidade: number };
    const nft = nftPorId(estado, corpo.nftId);
    const edicao = nft && edicaoDe(nft, Number(corpo.edicao));
    if (!nft || !edicao) return erro(404, "nao_encontrado", "Edição indisponível.");
    const quantidade = Number(corpo.quantidade);
    if (!Number.isInteger(quantidade) || quantidade < 1) {
      return erro(422, "validacao", "Quantidade inválida.", { quantidade: "Use um número inteiro." });
    }
    const atual = estado.carrinhos.find(
      (item) => item.dono === dono && item.nftId === nft.id && item.edicao === edicao.numero,
    );
    const ocupado = reservado(estado, dono, nft.id, edicao.numero);
    if (ocupado + quantidade > edicao.restante) {
      return erro(409, "estoque", `Só há ${edicao.restante} nesta edição.`);
    }
    if (atual) atual.quantidade += quantidade;
    else {
      estado.carrinhos.push({
        id: proximoId(estado, "item"),
        dono,
        nftId: nft.id,
        edicao: edicao.numero,
        quantidade,
      });
    }
    gravar(estado);
    const itens = estado.carrinhos
      .filter((item) => item.dono === dono)
      .map((item) => linhaCarrinho(estado, item))
      .filter((item) => item !== null);
    return HttpResponse.json({ itens }, { status: 201 });
  }),

  http.patch("/api/cart/items/:id", async ({ request, params }) => {
    const estado = carregar();
    const dono = donoDe(estado, request, cenarioDe(request));
    if (dono === "expirada") return erro(401, "sessao_expirada", "A sessão expirou.");
    const item = estado.carrinhos.find((atual) => atual.id === params.id && atual.dono === dono);
    if (!item) return erro(404, "nao_encontrado", "Item não encontrado.");
    const corpo = (await request.json()) as { quantidade: number };
    const quantidade = Number(corpo.quantidade);
    const nft = nftPorId(estado, item.nftId);
    const edicao = nft && edicaoDe(nft, item.edicao);
    if (!edicao) return erro(404, "nao_encontrado", "Edição indisponível.");
    if (!Number.isInteger(quantidade) || quantidade < 1) {
      return erro(422, "validacao", "Quantidade inválida.", { quantidade: "Use um número inteiro." });
    }
    if (quantidade > edicao.restante) return erro(409, "estoque", `Só há ${edicao.restante} nesta edição.`);
    item.quantidade = quantidade;
    gravar(estado);
    return HttpResponse.json(linhaCarrinho(estado, item));
  }),

  http.delete("/api/cart/items/:id", ({ request, params }) => {
    const estado = carregar();
    const dono = donoDe(estado, request, cenarioDe(request));
    if (dono === "expirada") return erro(401, "sessao_expirada", "A sessão expirou.");
    estado.carrinhos = estado.carrinhos.filter((item) => !(item.id === params.id && item.dono === dono));
    gravar(estado);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/quotes", async ({ request }) => {
    const estado = carregar();
    const cenario = cenarioDe(request);
    const dono = donoDe(estado, request, cenario);
    if (dono === "expirada") return erro(401, "sessao_expirada", "A sessão expirou.");
    const corpo = (await request.json()) as { cupom?: string | null; rede?: Rede; manterCupom?: boolean };
    const rede = corpo.rede === "polygon" ? "polygon" : "ethereum";
    const informado = corpo.manterCupom ? (estado.cupomPorDono[dono] ?? null) : (corpo.cupom ?? null);
    if (cenario === "cupom-invalido" && informado) {
      return erro(422, "cupom_invalido", "Cupom inválido.");
    }
    const resultado = montarCotacao(estado, { dono, cupom: informado, rede, agora: Date.now() });
    if (resultado.erro?.code === "estoque") return erro(409, "estoque", resultado.erro.message);
    if (resultado.erro?.code === "carrinho_vazio") return erro(422, resultado.erro.code, resultado.erro.message);
    if (resultado.erro) return erro(422, resultado.erro.code, resultado.erro.message);
    if (!corpo.manterCupom) {
      if (informado) estado.cupomPorDono[dono] = informado.trim().toUpperCase();
      else delete estado.cupomPorDono[dono];
    }
    gravar(estado);
    return HttpResponse.json(resultado.cotacao);
  }),

  http.post("/api/orders", async ({ request }) => {
    const estado = carregar();
    const cenario = cenarioDe(request);
    const sessao = usuarioDaSessao(estado, request, cenario);
    if (sessao === "expirada" || !sessao) return erro(401, "sessao_expirada", "Entre para concluir a compra.");
    const chave = request.headers.get("idempotency-key");
    if (!chave) return erro(422, "validacao", "Informe a chave de idempotência.");
    const corpo = (await request.json()) as CorpoPedido;
    return criarPedido(estado, sessao.usuarioId, corpo, chave, cenario);
  }),

  http.get("/api/orders/:id", ({ request, params }) => {
    const estado = carregar();
    const sessao = usuarioDaSessao(estado, request, cenarioDe(request));
    if (sessao === "expirada" || !sessao) return erro(401, "sessao_expirada", "A sessão expirou.");
    const pedido = estado.pedidos.find((item) => item.id === params.id);
    if (!pedido) return erro(404, "nao_encontrado", "Pedido não encontrado.");
    if (pedido.usuarioId !== sessao.usuarioId) return erro(403, "proibido", "Este pedido é de outra conta.");
    return HttpResponse.json(pedido);
  }),

  http.get("/api/profile", ({ request }) => {
    const estado = carregar();
    const sessao = usuarioDaSessao(estado, request, cenarioDe(request));
    if (sessao === "expirada" || !sessao) return erro(401, "sessao_expirada", "A sessão expirou.");
    const usuario = estado.usuarios.find((item) => item.id === sessao.usuarioId)!;
    return HttpResponse.json(publico(usuario));
  }),

  http.patch("/api/profile", async ({ request }) => {
    const estado = carregar();
    const sessao = usuarioDaSessao(estado, request, cenarioDe(request));
    if (sessao === "expirada" || !sessao) return erro(401, "sessao_expirada", "A sessão expirou.");
    const corpo = (await request.json()) as { nome?: string; email?: string };
    const usuario = estado.usuarios.find((item) => item.id === sessao.usuarioId)!;
    const fields: Record<string, string> = {};
    if (corpo.nome !== undefined && corpo.nome.trim().length < 2) fields.nome = "Informe o nome.";
    if (corpo.email !== undefined && !corpo.email.includes("@")) fields.email = "E-mail inválido.";
    if (corpo.email && estado.usuarios.some((item) => item.email === corpo.email!.toLowerCase() && item.id !== usuario.id)) {
      return erro(409, "email_em_uso", "Já existe uma conta com este e-mail.");
    }
    if (Object.keys(fields).length) return erro(422, "validacao", "Revise os campos.", fields);
    if (corpo.nome) usuario.nome = corpo.nome.trim();
    if (corpo.email) usuario.email = corpo.email.toLowerCase();
    gravar(estado);
    return HttpResponse.json(publico(usuario));
  }),

  http.post("/api/profile/avatar", async ({ request }) => {
    const estado = carregar();
    const sessao = usuarioDaSessao(estado, request, cenarioDe(request));
    if (sessao === "expirada" || !sessao) return erro(401, "sessao_expirada", "A sessão expirou.");
    const corpo = (await request.json()) as { avatar: string };
    if (!corpo.avatar?.startsWith("data:image/") || corpo.avatar.length > 500_000) {
      return erro(422, "validacao", "Envie uma imagem de até 400 KB.", { avatar: "Arquivo inválido." });
    }
    const usuario = estado.usuarios.find((item) => item.id === sessao.usuarioId)!;
    usuario.avatar = corpo.avatar;
    gravar(estado);
    return HttpResponse.json(publico(usuario));
  }),

  http.post("/api/profile/password", async ({ request }) => {
    const estado = carregar();
    const sessao = usuarioDaSessao(estado, request, cenarioDe(request));
    if (sessao === "expirada" || !sessao) return erro(401, "sessao_expirada", "A sessão expirou.");
    const corpo = (await request.json()) as { atual: string; nova: string };
    const usuario = estado.usuarios.find((item) => item.id === sessao.usuarioId)!;
    if ((await hashSenha(corpo.atual ?? "")) !== usuario.senhaHash) {
      return erro(422, "validacao", "Senha atual não confere.", { atual: "Senha atual não confere." });
    }
    if (!corpo.nova || corpo.nova.length < 8) {
      return erro(422, "validacao", "Revise os campos.", { nova: "Mínimo de 8 caracteres." });
    }
    usuario.senhaHash = await hashSenha(corpo.nova);
    gravar(estado);
    return HttpResponse.json({ ok: true });
  }),

  http.get("/api/wallets", ({ request }) => {
    const estado = carregar();
    const sessao = usuarioDaSessao(estado, request, cenarioDe(request));
    if (sessao === "expirada" || !sessao) return erro(401, "sessao_expirada", "A sessão expirou.");
    const itens = estado.carteiras
      .filter((item) => item.usuarioId === sessao.usuarioId)
      .map(({ usuarioId: _usuarioId, ...carteira }) => carteira);
    return HttpResponse.json({ itens });
  }),

  http.post("/api/wallets", async ({ request }) => {
    const estado = carregar();
    const sessao = usuarioDaSessao(estado, request, cenarioDe(request));
    if (sessao === "expirada" || !sessao) return erro(401, "sessao_expirada", "A sessão expirou.");
    const corpo = (await request.json()) as { apelido: string; endereco: string; principal?: boolean };
    const fields: Record<string, string> = {};
    if (!corpo.apelido || corpo.apelido.trim().length < 2) fields.apelido = "Dê um apelido.";
    if (!ENDERECO.test(corpo.endereco ?? "")) fields.endereco = "Endereço fora do formato 0x + 40 caracteres.";
    if (Object.keys(fields).length) return erro(422, "validacao", "Revise os campos.", fields);
    if (corpo.principal) {
      for (const carteira of estado.carteiras) {
        if (carteira.usuarioId === sessao.usuarioId) carteira.principal = false;
      }
    }
    const carteira = {
      id: proximoId(estado, "wal"),
      usuarioId: sessao.usuarioId,
      apelido: corpo.apelido.trim(),
      endereco: corpo.endereco,
      principal: Boolean(corpo.principal) || estado.carteiras.every((item) => item.usuarioId !== sessao.usuarioId),
    };
    estado.carteiras.push(carteira);
    gravar(estado);
    const { usuarioId: _usuarioId, ...publica } = carteira;
    return HttpResponse.json(publica, { status: 201 });
  }),

  http.patch("/api/wallets/:id", async ({ request, params }) => {
    const estado = carregar();
    const sessao = usuarioDaSessao(estado, request, cenarioDe(request));
    if (sessao === "expirada" || !sessao) return erro(401, "sessao_expirada", "A sessão expirou.");
    const carteira = estado.carteiras.find((item) => item.id === params.id && item.usuarioId === sessao.usuarioId);
    if (!carteira) return erro(404, "nao_encontrado", "Carteira não encontrada.");
    const corpo = (await request.json()) as { apelido?: string; endereco?: string; principal?: boolean };
    const fields: Record<string, string> = {};
    if (corpo.apelido !== undefined && corpo.apelido.trim().length < 2) fields.apelido = "Dê um apelido.";
    if (corpo.endereco !== undefined && !ENDERECO.test(corpo.endereco)) {
      fields.endereco = "Endereço fora do formato 0x + 40 caracteres.";
    }
    if (Object.keys(fields).length) return erro(422, "validacao", "Revise os campos.", fields);
    if (corpo.apelido) carteira.apelido = corpo.apelido.trim();
    if (corpo.endereco) carteira.endereco = corpo.endereco;
    if (corpo.principal) {
      for (const item of estado.carteiras) {
        if (item.usuarioId === sessao.usuarioId) item.principal = item.id === carteira.id;
      }
    }
    gravar(estado);
    const { usuarioId: _usuarioId, ...publica } = carteira;
    return HttpResponse.json(publica);
  }),

  http.post("/api/wallets/:id/connection", async ({ request, params }) => {
    const estado = carregar();
    const cenario = cenarioDe(request);
    const sessao = usuarioDaSessao(estado, request, cenario);
    if (sessao === "expirada" || !sessao) return erro(401, "sessao_expirada", "A sessão expirou.");
    const carteira = estado.carteiras.find((item) => item.id === params.id && item.usuarioId === sessao.usuarioId);
    if (!carteira) return erro(404, "nao_encontrado", "Carteira não encontrada.");
    const corpo = (await request.json()) as { rede: Rede };
    if (corpo.rede !== "ethereum" && corpo.rede !== "polygon") {
      return erro(422, "validacao", "Escolha a rede.", { rede: "Rede inválida." });
    }
    if (cenario === "conexao-recusada") {
      return erro(422, "conexao_recusada", "A carteira recusou a conexão.");
    }
    await delay(250);
    return HttpResponse.json({
      carteiraId: carteira.id,
      rede: corpo.rede,
      conectada: true,
      endereco: carteira.endereco,
    });
  }),
];
