export const COLECOES = ["Verde", "Lilás", "Areia"] as const;

export const CONTAGEM_COLECAO: Record<(typeof COLECOES)[number], number> = {
  Verde: 8,
  Lilás: 7,
  Areia: 9,
};
