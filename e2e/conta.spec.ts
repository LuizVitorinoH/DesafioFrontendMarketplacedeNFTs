import { expect, test } from "@playwright/test";
import { ANA, BRUNO, definirCenario, entrar, porNoCarrinho, preparar } from "./apoio";

test.beforeEach(async ({ page }) => {
  await preparar(page);
});

test("cadastro, login, expiração, saída e troca de conta @mobile", async ({ page }) => {
  const email = `nova-${Date.now()}@lume.dev`;
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill("Nova Pessoa");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("segredo123");
  await page.getByLabel("Confirmar senha").fill("segredo123");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByRole("heading", { name: /Seja dono do futuro/i })).toBeVisible();

  await page.goto("/conta");
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page.getByRole("heading", { name: /Seja dono do futuro/i })).toBeVisible();

  await entrar(page, ANA);
  await definirCenario(page, "sessao-expirada");
  await page.goto("/conta");
  await expect(page).toHaveURL(/entrar/);

  await definirCenario(page, "padrao");
  await entrar(page, BRUNO);
  await page.goto("/conta");
  await expect(page.getByLabel("E-mail")).toHaveValue(BRUNO.email);
});

test("favorito otimista com falha e retorno @mobile", async ({ page }) => {
  await entrar(page, ANA);
  await page.goto("/nfts/ape-03");
  await page.getByRole("button", { name: "Favoritar" }).click();
  await expect(page.getByRole("button", { name: "Remover dos favoritos" })).toBeVisible();

  await definirCenario(page, "favorito-falha");
  await page.getByRole("button", { name: "Remover dos favoritos" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("button", { name: "Remover dos favoritos" })).toBeVisible();
});

test("carrinho, cupom e permanência após refresh e login @mobile", async ({ page }) => {
  await porNoCarrinho(page);
  await page.reload();
  await expect(page.getByRole("link", { name: "Óculos verde" })).toBeVisible();
  await page.getByLabel("Cupom").fill("BEMVINDO");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByText("0.1840 ETH")).toBeVisible();
  await page.getByLabel("Cupom").fill("EXPIRADO");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByRole("alert")).toContainText("expirou");

  await entrar(page, ANA);
  await page.goto("/carrinho");
  await expect(page.getByRole("link", { name: "Óculos verde" })).toBeVisible();
  await page.getByRole("button", { name: "Remover Óculos verde" }).click();
  await expect(page.getByText("O carrinho está vazio.")).toBeVisible();
});
