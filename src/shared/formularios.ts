import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { z } from "zod";

export const esquemaEntrar = z.object({
  email: z.string().min(1, "Informe e-mail e senha."),
  senha: z.string().min(1, "Informe e-mail e senha."),
});

export const esquemaCadastro = z
  .object({
    nome: z.string().trim().min(2, "Informe o nome."),
    email: z.string().refine((valor) => valor.includes("@"), "E-mail inválido."),
    senha: z.string().min(8, "Mínimo de 8 caracteres."),
    confirma: z.string(),
  })
  .refine((dados) => dados.senha === dados.confirma, {
    path: ["confirma"],
    message: "As senhas não coincidem.",
  });

export const esquemaPerfil = z.object({
  nome: z.string().trim().min(2, "Informe o nome."),
  email: z.string().refine((valor) => valor.includes("@"), "E-mail inválido."),
});

export const esquemaSenha = z.object({
  atual: z.string().min(1, "Informe a senha atual."),
  nova: z.string().min(8, "Mínimo de 8 caracteres."),
});

export const esquemaCarteira = z.object({
  apelido: z.string().trim().min(2, "Dê um apelido."),
  endereco: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Endereço fora do formato 0x + 40 caracteres."),
  principal: z.boolean(),
});

export const esquemaPagamento = z.object({
  nome: z.string().trim().min(2, "Informe o nome."),
  email: z.string().refine((valor) => valor.includes("@"), "E-mail inválido."),
  documento: z.string().regex(/^\d{11}$/, "Use 11 números, sem pontuação."),
  carteiraId: z.string().min(1, "Escolha uma carteira."),
});

export const esquemaCupom = z.object({
  cupom: z.string(),
});

export function aplicarErros<T extends FieldValues>(form: UseFormReturn<T>, campos: Record<string, string>) {
  for (const [campo, mensagem] of Object.entries(campos)) {
    form.setError(campo as Path<T>, { message: mensagem });
  }
}
