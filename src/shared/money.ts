import Decimal from "decimal.js";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export function dinheiro(valor: string | number): Decimal {
  return new Decimal(valor);
}

export function texto(valor: Decimal): string {
  const cru = valor.toFixed(4).replace(/\.?0+$/, "");
  return cru === "" ? "0" : cru;
}

export function fixo(valor: string): string {
  return dinheiro(valor).toFixed(4);
}

export function somar(valores: string[]): string {
  return texto(valores.reduce((acc, item) => acc.plus(dinheiro(item)), new Decimal(0)));
}

export function multiplicar(preco: string, quantidade: number): string {
  return texto(dinheiro(preco).times(quantidade));
}

export function percentual(base: string, pontos: number): string {
  return texto(dinheiro(base).times(pontos).dividedBy(100));
}

export function exibirEth(valor: string): string {
  return `${fixo(valor)} ETH`;
}
