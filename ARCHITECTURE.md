# Arquitetura

SPA em Vite. A tela fala com o TanStack Query, o Query com o Axios, o Axios com o MSW. O estado simulado mora só em `src/mocks` e persiste em `localStorage` na chave `lume.dados`. A UI e os handlers importam os mesmos tipos de `src/shared/contracts.ts`.

ETH é string decimal. A conta e a formatação passam por `decimal.js`. Quantidade é inteira. A cotação que a API devolve é a referência do pedido: a tela mostra subtotal, desconto, taxa e total, e não os recalcula.

## Contratos

Base `/api`. Erro: `code`, `message` e `fields` quando a validação aponta o campo.

- `POST /auth/register`, `POST /auth/login`, `GET /auth/session`, `POST /auth/logout`
- `GET /nfts`, `GET /nfts/:id`
- `GET /favorites`, `POST /favorites`, `DELETE /favorites/:id`
- `GET /cart/items`, `POST /cart/items`, `PATCH /cart/items/:id`, `DELETE /cart/items/:id`
- `POST /quotes`
- `POST /orders`, `GET /orders/:id`
- `GET /profile`, `PATCH /profile`, `POST /profile/password`, `POST /profile/avatar`
- `GET /wallets`, `POST /wallets`, `PATCH /wallets/:id`, `POST /wallets/:id/connection`

Códigos: `401` sessão expirada, `403` recurso de outro usuário, `404` obra ou pedido, `409` e-mail duplicado, estoque ou idempotência divergente, `422` formulário, cupom inválido ou expirado, `503` e falha de rede.

`POST /orders` exige `Idempotency-Key`. A mesma chave com o mesmo corpo devolve o pedido já criado. A mesma chave com outro corpo responde `409`. Estados: `pending`, `confirmed`, `declined`. Confirmado e recusado não mudam mais. O recibo é a cópia congelada da cotação. Só sai do carrinho a quantidade confirmada, e só depois da confirmação.

A cotação carrega `id` e `versao`, derivados da rede, do cupom e das linhas. Confirmar com versão antiga responde `409` `cotacao_desatualizada`. O cupom fica no estado do dono. `manterCupom: true` reaproveita o cupom gravado; `null` apaga; uma string grava.

## Sessão e carrinho

A senha não é guardada. O mock compara o hash SHA-256. O cliente guarda só o token opaco em `lume.sessao`, com validade de 8 horas. No refresh, `GET /auth/session` recupera o usuário. Um `401` fora de login, cadastro e leitura de sessão limpa o token, esvazia o cache e manda para `/entrar` com a rota de retorno.

O visitante tem um id em `lume.visitante`. O carrinho desse id vive no mock e sobrevive ao refresh. No login e no cadastro, os itens do visitante entram na conta até o estoque da edição. Logout gera outro id de visitante, limpa o cache e desliga os listeners de evento.

## Cache

A chave do catálogo inclui busca, filtros, ordem e página. Trocar filtro zera a página na URL. Chaves de sessão, favoritos, carrinho, cotação, pedido, perfil e carteiras incluem o dono. Logout e troca de conta chamam `queryClient.clear()`.

Consulta: tenta de novo em falha de rede e `5xx`, no máximo duas vezes. Não tenta de novo em `4xx`. A mutation de pedido não se repete sozinha. Se a resposta não chega, o cliente reenvia a mesma `Idempotency-Key` uma vez. A retomada manual usa a chave guardada em `sessionStorage` enquanto o corpo não muda.

Favorito atualiza a cache na hora e volta ao valor anterior se a mutation falhar.

## Tempo real

O cliente usa `socket.io-client`, importado só depois de `worker.start()`, porque a biblioteca captura `WebSocket` na importação. O mock liga `wss://marketplace.local` com `ws.link` e `@mswjs/socket.io-binding`. Transporte websocket, sem servidor Node.

Eventos `nft.updated` e `order.updated`: `eventId`, `versao`, `recursoId` e o recurso. O cliente ignora `eventId` já visto e versão menor ou igual à última aplicada naquele recurso. Preço de obra é público. `order.updated` só é emitido para a conexão que enviou o token daquele usuário.

No `connect`, a tela invalida a obra aberta, o catálogo, o carrinho, a cotação e o pedido pendente, e busca de novo no REST.

O binding não cobre salas, namespaces nem broadcast. Há um namespace e a emissão é por conexão. Isso basta para o preço público e para o pedido do dono.

## Telas

Rotas: `/`, `/nfts/$nftId`, `/carrinho`, `/pagamento`, `/pedidos/$pedidoId`, `/entrar`, `/cadastro`, `/conta`, `/conta/carteiras`. Endereço desconhecido cai na rota esparramada. Não há páginas de editorial, suporte, atividade, ofertas ou downloads.

Busca, coleção, preço, disponibilidade, ordem e página ficam na URL. O campo visível diz “Buscar coleções” e consulta o nome da obra. O filtro Coleções continua Verde, Lilás e Areia, que são dados da obra. O retrato segue a variante e não é trocado para repetir a cor da coleção. O catálogo, o detalhe e o resumo reservam altura com skeleton. A animação de shimmer desliga com `prefers-reduced-motion`.

Formulários usam React Hook Form e Zod. O `fields` do erro da API volta para o campo. Diálogo prende o foco. Mudança de preço e de pedido entra numa região `aria-live`.

## Deploy

`vercel.json` reescreve para `index.html` só o caminho sem ponto no nome, para o arquivo estático com extensão não receber HTML no lugar do JavaScript.

## Lighthouse

Três corridas no `vite preview` do build de produção, com o mock ligado. A mediana fica em `lighthouse/mediana.json`. Metas: desempenho 90, acessibilidade 95, boas práticas 95, SEO 90.

Mediana desta máquina (Windows, Node 25, Lighthouse 13.5, três corridas):

| Página | Forma | Desempenho | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Início | desktop | 99 | 100 | 100 | 100 | 0,9 s | 0,001 | 0 ms |
| Detalhe | desktop | 99 | 100 | 100 | 100 | 1,0 s | 0,013 | 0 ms |
| Início | mobile | 87 | 100 | 100 | 100 | 3,5 s | 0 | 89 ms |
| Detalhe | mobile | 85 | 100 | 100 | 100 | 3,8 s | 0 | 149 ms |

No desktop as quatro metas fecham. No mobile, acessibilidade, boas práticas e SEO também. O desempenho mobile fica abaixo de 90 porque o LCP passa de 3 s sob a rede e a CPU simuladas. A causa é o custo do próprio mock: o worker do MSW sai com cerca de 456 kB (169 kB gzip) e o pacote da aplicação soma fontes, Zod e o cliente. O CLS do início ficou em 0 depois de reservar a caixa do retrato. O worker continua no build, porque a demonstração depende dele.

## Figma

A composição segue os frames de início, detalhe, carrinho, pagamento, login e cadastro. Perfil, carteiras e confirmação usam o mesmo vocabulário, sem um frame próprio.

Diferenças em relação ao quadro:

- A marca visível é Kurio.
- Os retratos são quatro artes em WebP, escolhidas pela variante da obra. Filtrar uma coleção não troca essas artes.
- A família é Outfit. O fundo é `#140e0b` e o destaque é `#e8893a`.
- Login e cadastro não oferecem rede social. O pagamento não lista extensões de carteira.
