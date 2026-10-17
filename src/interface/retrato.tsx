import type { ReactNode } from "react";

const ARQUIVOS = ["/nfts/jaqueta.webp", "/nfts/capuz.webp", "/nfts/fone.webp", "/nfts/blazer.webp"];

type Props = {
  variante: number;
  titulo: string;
  className?: string;
};

export function Retrato({ variante, titulo, className }: Props) {
  return (
    <img
      src={ARQUIVOS[((variante % ARQUIVOS.length) + ARQUIVOS.length) % ARQUIVOS.length]}
      alt={titulo}
      width={500}
      height={500}
      className={`object-cover ${className ?? ""}`}
    />
  );
}

export function Moldura({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`overflow-hidden rounded-2xl bg-[#efe6d6] ${className ?? ""}`}>{children}</div>;
}
