import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/shared/cn";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

const botao = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      tom: {
        laranja: "bg-laranja text-[#1a1008] hover:bg-laranja-escuro",
        fantasma: "bg-transparent text-texto hover:bg-elevado",
        borda: "border border-linha bg-elevado text-texto hover:border-laranja",
      },
    },
    defaultVariants: { tom: "laranja" },
  },
);

type BotaoProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof botao> & { asChild?: boolean };

export function Botao({ className, tom, asChild, ...props }: BotaoProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(botao({ tom }), className)} {...props} />;
}

export function Campo({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-linha bg-fundo px-3 py-2.5 text-sm text-texto placeholder:text-mudo/70",
        className,
      )}
      {...props}
    />
  );
}

export function Esqueleto({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-xl", className)} />;
}

export function CaixaDialogo({
  aberto,
  aoFechar,
  titulo,
  children,
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={aberto} onOpenChange={(valor) => !valor && aoFechar()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[min(100%-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-2xl border border-linha bg-elevado p-6">
          <Dialog.Title className="text-lg font-semibold">{titulo}</Dialog.Title>
          <div className="mt-4">{children}</div>
          <Dialog.Close className="absolute top-4 right-4 rounded-md px-2 py-1 text-sm text-mudo">
            Fechar
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
