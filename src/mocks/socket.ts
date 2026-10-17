import { ws } from "msw";
import { toSocketIo } from "@mswjs/socket.io-binding";
import { carregar } from "@/mocks/store";
import { registrarLigacao } from "@/mocks/realtime";

const canal = ws.link("wss://marketplace.local");

export const socketHandlers = [
  canal.addEventListener("connection", (connection) => {
    const { client } = toSocketIo(connection);
    const ligacao = {
      usuarioId: null as string | null,
      emitir: (nome: string, dados: unknown) => client.emit(nome, dados),
      fechar: () => connection.client.close(),
    };
    const sair = registrarLigacao(ligacao);

    client.on("sessao", (_evento, token: string | null) => {
      const estado = carregar();
      const sessao = token ? estado.sessoes[token] : undefined;
      ligacao.usuarioId = sessao && sessao.expiraEm > Date.now() ? sessao.usuarioId : null;
    });

    connection.client.addEventListener("close", sair);
  }),
];
