import { expect, test } from "@playwright/test";
import { preparar } from "./apoio";

test.beforeEach(async ({ page }) => {
  await preparar(page);
});

test("busca, filtros, ordem, paginação e histórico @mobile", async ({ page }) => {
  await page.goto("/");
  const busca = page.locator("input[placeholder='Buscar coleções']:visible");
  await busca.fill("capuz");
  await busca.press("Enter");
  await expect(page.getByRole("heading", { name: "Capuz lilás" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Óculos verde" })).toHaveCount(0);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Seja dono do futuro/i })).toBeVisible();
  const estreito = (page.viewportSize()?.width ?? 1440) < 1024;
  const painel = estreito ? page.getByRole("dialog") : page.locator("#catalogo");
  if (estreito) await page.getByRole("button", { name: "Filtros" }).click();
  await page.evaluate(() => window.scrollTo(0, 480));
  await painel.getByRole("checkbox", { name: "Verde" }).check({ force: true });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(400);
  await painel.getByRole("checkbox", { name: "Lilás" }).check();
  await expect(page).toHaveURL(/Verde/);
  await expect(page).toHaveURL(/Lil/);
  await expect(page.getByRole("heading", { name: "Óculos verde" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Chapéu de feltro" })).toHaveCount(0);

  await page.getByLabel("Ordenar").selectOption("preco-asc");
  await expect(page).toHaveURL(/ordenar=preco-asc/);
  await expect(page.getByRole("article").first().getByRole("heading")).toHaveText("Fone baixo");

  const antes = page.url();
  await page.goto("/?pagina=2");
  await expect(page.getByRole("heading", { name: "Sombra roxa" })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(antes);
  await expect(page.getByRole("heading", { name: "Fone baixo" })).toBeVisible();
});

test("detalhe direto e obra inexistente @mobile", async ({ page }) => {
  await page.goto("/nfts/ape-01");
  await expect(page.getByRole("heading", { name: "Óculos verde" })).toBeVisible();
  await page.goto("/nfts/nao-existe");
  await expect(page.getByRole("heading", { name: "Obra não encontrada." })).toBeVisible();
});

test("filtros em 768 e 1440", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "larguras fixas só no desktop");
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Filtros" })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByRole("group", { name: "Coleções" })).toBeVisible();
});
