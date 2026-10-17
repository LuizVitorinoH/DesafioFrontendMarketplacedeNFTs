const vistos = new Set<string>();
const versoes = new Map<string, number>();

export function aceitarEvento(eventId: string, recurso: string, versao: number) {
  if (vistos.has(eventId)) return false;
  vistos.add(eventId);
  if (vistos.size > 300) {
    const primeiro = vistos.values().next().value;
    if (primeiro) vistos.delete(primeiro);
  }
  return registrarVersao(recurso, versao);
}

export function registrarVersao(recurso: string, versao: number) {
  const atual = versoes.get(recurso) ?? 0;
  if (versao <= atual) return false;
  versoes.set(recurso, versao);
  return true;
}

export function limparEventos() {
  vistos.clear();
  versoes.clear();
}

let publicar = (_texto: string) => {};

export function anunciar(texto: string) {
  publicar(texto);
}

export function ouvirAnuncio(fn: (texto: string) => void) {
  publicar = fn;
}
