import { expect, type Page } from "@playwright/test";

export const ANA = { email: "ana@lume.dev", senha: "farol-lume", nome: "Ana" };
export const BRUNO = { email: "bruno@lume.dev", senha: "farol-lume", nome: "Bruno" };

export async function definirCenario(page: Page, nome: string) {
  await page.evaluate((valor) => localStorage.setItem("lume.cenario", valor), nome);
}

export async function preparar(page: Page, nome = "padrao") {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/?reset=1&cenario=${nome}`);
}

export async function entrar(page: Page, usuario = ANA) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(usuario.email);
  await page.getByLabel("Senha").fill(usuario.senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: /Seja dono do futuro/i })).toBeVisible();
}

export async function porNoCarrinho(page: Page, nome = "Óculos verde") {
  await page.goto("/");
  await page.getByRole("link", { name: nome }).first().click();
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await expect(page.getByRole("heading", { name: "Carrinho" })).toBeVisible();
}
