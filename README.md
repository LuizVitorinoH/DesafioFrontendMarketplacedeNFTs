# Kurio

Marketplace de NFTs em React. Os dados vêm de um mock no navegador: não há backend, carteira real nem gateway de pagamento. A busca do catálogo pede “Buscar coleções” e consulta o nome da obra. O filtro de coleção usa Verde, Lilás e Areia; o retrato continua o da variante e não muda com o filtro.

A interface usa a marca Kurio. Chaves de armazenamento, o gancho `window.__lume` e os e-mails de demonstração mantêm o prefixo `lume`.

## Subir

```bash
npm install
npx playwright install chromium
npm run dev
```

Abre em `http://127.0.0.1:5173`. O mock sobe com o app, a menos que `VITE_ENABLE_MSW` seja `false`.

## Contas

As duas contas de demonstração usam a senha `farol-lume`.

| E-mail | Nome |
| --- | --- |
| ana@lume.dev | Ana Ribeiro |
| bruno@lume.dev | Bruno Teixeira |

Ana começa com as carteiras Principal e Reserva e com o favorito da obra `ape-02`. Bruno começa com a carteira Estúdio. Cupom `BEMVINDO` dá 10%. `EXPIRADO` está vencido desde 2020.

## Cenário e reset

O cenário ativo fica em `localStorage` na chave `lume.cenario` e segue no header `X-Cenario`.

- `/?reset=1` apaga dados, sessão, visitante e `sessionStorage`, e volta às fixtures.
- `/?cenario=lento` grava o cenário antes das requisições. Vale para qualquer nome da lista abaixo.

| Cenário | Efeito |
| --- | --- |
| `padrao` | Pedido confirma cerca de 700 ms depois |
| `vazio` | Catálogo sem obras |
| `lento` | Cada resposta espera 1,8 s |
| `variavel` | Latência curta ou 1,4 s, conforme o tamanho da busca |
| `offline` | Falha de rede |
| `erro` | `503` no catálogo |
| `sessao-expirada` | `401` quando há token |
| `conflito-cadastro` | E-mail sempre duplicado |
| `favorito-falha` | Favoritar e desfavoritar respondem `503` |
| `cupom-invalido` | Qualquer cupom responde `422` |
| `edicao-esgotada` | O pedido nasce com conflito de estoque |
| `timeout-pedido` | O pedido é gravado e a resposta só sai depois de 20 s |
| `pedido-pendente` | O pedido fica `pending` |
| `pagamento-recusado` | O pedido termina `declined` |
| `pagamento-confirmado` | O pedido termina `confirmed` |
| `conexao-recusada` | Conectar a carteira responde `422` |

No console, `window.__lume` dispara o que a tela não tem botão para fazer:

- `resetar()`
- `alterarPreco(nftId, preco)`
- `esgotar(nftId, numeroDaEdicao)`
- `repetir(nftId)` envia o mesmo evento duas vezes
- `antigo(nftId)` envia uma versão anterior
- `soltarPedido(pedidoId, "confirmed" | "declined")`
- `cairConexao()`

## Comandos

```bash
npm run dev
npm run build
npm run preview
npm run typecheck
npm run lint
npm run test:e2e
npm run lighthouse
```

O preview usa a porta `4173`. O Lighthouse sobe esse preview se ele ainda não estiver no ar, faz três corridas de início e detalhe em mobile e desktop, e grava a mediana em `lighthouse/mediana.json`. Os relatórios de cada corrida ficam em `lighthouse/reports`. Rode o build antes.

## Publicação

O `vercel.json` devolve `index.html` para rotas sem ponto no caminho, então acesso direto e refresh funcionam na Vercel. O build de demonstração sobe com o mock ligado.

O Playwright usa Chromium em 1440×900 e, nos testes marcados com `@mobile`, em 390×844. Há um fluxo de layout em 768 dentro do projeto desktop. Cada teste entra com `?reset=1` e o cenário escolhido.
