import { expect, test } from "@playwright/test";
import { ANA, definirCenario, entrar, preparar } from "./apoio";

test("teclado, foco do diálogo e validação", async ({ page }) => {
  await preparar(page);
  await page.goto("/cadastro");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByLabel("Nome")).toHaveAttribute("aria-invalid", "true");
  const erro = page.locator("#erro-nome");
  await expect(erro).toHaveText("Informe o nome.");
  await expect(page.getByLabel("Nome")).toHaveAttribute("aria-describedby", "erro-nome");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const abrir = page.getByRole("button", { name: "Abrir menu" });
  await abrir.click();
  await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => Boolean(document.activeElement?.closest("[role='dialog']"))))
    .toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Menu" })).toBeHidden();
  await expect(abrir).toBeFocused();
});

test("perfil, avatar, senha e carteira com validação", async ({ page }) => {
  await preparar(page);
  await entrar(page, ANA);
  await page.goto("/conta");
  await page.getByLabel("Nome").fill("Ana Ribeiro Costa");
  await page.getByRole("button", { name: "Salvar dados" }).click();
  await expect(page.getByRole("status")).toHaveText("Dados atualizados.");
  await page.reload();
  await expect(page.getByLabel("Nome")).toHaveValue("Ana Ribeiro Costa");

  await page.getByLabel("Senha atual").fill("errada");
  await page.getByLabel("Nova senha").fill("outrasenha");
  await page.getByRole("button", { name: "Alterar senha" }).click();
  await expect(page.locator("#erro-senha-atual")).toHaveText("Senha atual não confere.");

  await page.getByLabel("Imagem").setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await page.getByRole("button", { name: "Enviar avatar" }).click();
  await expect(page.getByRole("img", { name: /Avatar de/ })).toBeVisible();

  await page.getByLabel("Senha atual").fill("farol-lume");
  await page.getByLabel("Nova senha").fill("farol-novo");
  await page.getByRole("button", { name: "Alterar senha" }).click();
  await expect(page.getByRole("status")).toHaveText("Senha alterada.");

  await page.getByRole("link", { name: "Carteiras" }).click();
  await page.getByRole("button", { name: "Cadastrar carteira" }).click();
  await expect(page.locator("#erro-endereco")).toBeVisible();
  await page.getByLabel("Apelido").fill("Estúdio");
  await page.getByLabel("Endereço").fill("0x4444444444444444444444444444444444444444");
  await page.getByRole("button", { name: "Cadastrar carteira" }).click();
  await expect(page.getByRole("button", { name: "Editar Estúdio" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Editar Estúdio" })).toBeVisible();
});

test("skeleton lento, falha e nova tentativa", async ({ page }) => {
  await preparar(page, "lento");
  await page.goto("/");
  await expect(page.getByLabel("Carregando obras")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Seja dono do futuro/i })).toBeVisible();
  await expect(page.getByLabel("Carregando obras")).toBeHidden({ timeout: 10_000 });

  await definirCenario(page, "erro");
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("Não foi possível carregar o catálogo.");
  await definirCenario(page, "padrao");
  await page.getByRole("button", { name: "Tentar de novo" }).click();
  await expect(page.getByRole("heading", { name: "Óculos verde" })).toBeVisible();
});

test("cadastro em conflito", async ({ page }) => {
  await preparar(page);
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill("Ana Outra");
  await page.getByLabel("E-mail").fill(ANA.email);
  await page.getByLabel("Senha", { exact: true }).fill("segredo123");
  await page.getByLabel("Confirmar senha").fill("segredo123");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByRole("alert")).toContainText("Já existe uma conta");
});
