import { expect, test } from "@playwright/test";
import { ANA, entrar, preparar } from "./apoio";

test("regressão visual do início @mobile", async ({ page }) => {
  await preparar(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Seja dono do futuro/i })).toBeVisible();
  await expect(page.getByLabel("Carregando obras")).toBeHidden();
  await expect(page).toHaveScreenshot("inicio.png", { fullPage: true, maxDiffPixelRatio: 0.02 });
});

test("regressão visual de detalhe, carrinho e pagamento", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "baselines de fluxo no desktop");
  await preparar(page);
  await page.goto("/nfts/ape-01");
  await expect(page.getByRole("heading", { name: "Óculos verde" })).toBeVisible();
  await expect(page).toHaveScreenshot("detalhe.png", { fullPage: true, maxDiffPixelRatio: 0.02 });

  await entrar(page, ANA);
  await page.goto("/nfts/ape-01");
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await expect(page.getByRole("heading", { name: "Carrinho" })).toBeVisible();
  await expect(page.getByLabel("Carregando resumo")).toBeHidden();
  await expect(page).toHaveScreenshot("carrinho.png", { fullPage: true, maxDiffPixelRatio: 0.02 });

  await page.getByRole("link", { name: "Ir para pagamento" }).click();
  await expect(page.getByRole("heading", { name: "Pagamento" })).toBeVisible();
  await expect(page.getByLabel("Carregando resumo")).toBeHidden();
  await expect(page).toHaveScreenshot("pagamento.png", { fullPage: true, maxDiffPixelRatio: 0.02 });
});
