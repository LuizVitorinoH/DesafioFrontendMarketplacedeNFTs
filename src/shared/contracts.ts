export type DecimalString = string;

export type Edicao = {
  numero: number;
  restante: number;
};

export type Nft = {
  id: string;
  nome: string;
  artista: string;
  colecao: string;
  descricao: string;
  variante: number;
  preco: DecimalString;
  edicoes: Edicao[];
  destaque: boolean;
  versao: number;
};

export type Ordenacao = "recentes" | "preco-asc" | "preco-desc" | "nome";

export type ConsultaNfts = {
  q?: string;
  colecao?: string[];
  precoMin?: string;
  precoMax?: string;
  disponivel?: boolean;
  ordenar?: Ordenacao;
  pagina?: number;
  limite?: number;
};

export type PaginaNfts = {
  itens: Nft[];
  total: number;
  pagina: number;
  limite: number;
};

export type UsuarioPublico = {
  id: string;
  nome: string;
  email: string;
  avatar: string | null;
};

export type Sessao = {
  token: string;
  usuario: UsuarioPublico;
};

export type Carteira = {
  id: string;
  apelido: string;
  endereco: string;
  principal: boolean;
};

export type Rede = "ethereum" | "polygon";

export type ItemCarrinho = {
  id: string;
  nftId: string;
  nome: string;
  artista: string;
  variante: number;
  edicao: number;
  quantidade: number;
  preco: DecimalString;
  restante: number;
  versao: number;
};

export type Carrinho = {
  itens: ItemCarrinho[];
};

export type LinhaCotacao = {
  nftId: string;
  edicao: number;
  quantidade: number;
  preco: DecimalString;
  subtotal: DecimalString;
};

export type Cotacao = {
  id: string;
  versao: number;
  itens: LinhaCotacao[];
  subtotal: DecimalString;
  desconto: DecimalString;
  taxa: DecimalString;
  total: DecimalString;
  cupom: string | null;
  rede: Rede;
};

export type StatusPedido = "pending" | "confirmed" | "declined";

export type Recibo = {
  itens: LinhaCotacao[];
  subtotal: DecimalString;
  desconto: DecimalString;
  taxa: DecimalString;
  total: DecimalString;
  cupom: string | null;
  rede: Rede;
  carteira: string;
};

export type Pedido = {
  id: string;
  status: StatusPedido;
  versao: number;
  transacao: string;
  recibo: Recibo;
  criadoEm: string;
};

export type EventoNft = {
  eventId: string;
  tipo: "nft.updated";
  recursoId: string;
  versao: number;
  nft: Nft;
};

export type EventoPedido = {
  eventId: string;
  tipo: "order.updated";
  recursoId: string;
  versao: number;
  usuarioId: string;
  pedido: Pedido;
};

export type ErroApi = {
  code: string;
  message: string;
  fields?: Record<string, string>;
};

export type CorpoPedido = {
  cotacaoId: string;
  cotacaoVersao: number;
  carteiraId: string;
  rede: Rede;
  nome: string;
  email: string;
  documento: string;
};
