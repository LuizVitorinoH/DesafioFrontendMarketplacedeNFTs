export {};

declare global {
  interface Window {
    __lume: {
      alterarPreco: (nftId: string, preco: string) => void;
      esgotar: (nftId: string, numero: number) => void;
      repetir: (nftId: string) => void;
      antigo: (nftId: string) => void;
      soltarPedido: (pedidoId: string, status: "confirmed" | "declined") => void;
      cairConexao: () => void;
      resetar: () => void;
    };
  }
}
