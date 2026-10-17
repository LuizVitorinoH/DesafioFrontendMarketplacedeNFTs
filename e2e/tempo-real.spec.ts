import { expect, test } from "@playwright/test";
import { ANA, entrar, preparar } from "./apoio";

test("preço muda no checkout e a cotação antiga não confirma", async ({ page }) => {
  await preparar(page);
  await entrar(page, ANA);
  await page.goto("/nfts/ape-01");
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await page.getByRole("link", { name: "Ir para pagamento" }).click();
  await page.getByLabel("Documento").fill("12345678901");
  await page.getByLabel("Carteira").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Conectar" }).click();
  await expect(page.getByText(/Conectada em/)).toBeVisible();
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await expect(page.getByRole("heading", { name: "Revisão" })).toBeVisible();
  await page.evaluate(() => window.__lume.alterarPreco("ape-01", "9.5"));
  await expect(page.getByRole("status")).toContainText("A cotação mudou");
  await expect(page.getByRole("button", { name: "Confirmar pedido" })).toBeDisabled();
  await page.getByRole("button", { name: "Aceitar nova cotação" }).click();
  await page.getByRole("button", { name: "Confirmar pedido" }).click();
  await expect(page.getByRole("heading", { name: /Recibo/ })).toBeVisible();
  await expect(page.getByText("9.5000 ETH").first()).toBeVisible();
});

test("evento antigo, duplicado, queda e retomada do pedido", async ({ page }) => {
  await preparar(page, "pedido-pendente");
  await entrar(page, ANA);
  await page.goto("/nfts/ape-06");
  await expect(page.getByRole("heading", { name: "Perfil noturno" })).toBeVisible();
  await page.evaluate(async () => {
    window.__lume.alterarPreco("ape-06", "3.25");
    window.__lume.repetir("ape-06");
    window.__lume.antigo("ape-06");
  });
  await expect(page.getByText("3.2500 ETH")).toBeVisible();
  await expect(page.getByText("0.0100 ETH")).toHaveCount(0);

  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await page.getByRole("link", { name: "Ir para pagamento" }).click();
  await page.getByLabel("Documento").fill("12345678901");
  await page.getByLabel("Carteira").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Conectar" }).click();
  await expect(page.getByText(/Conectada em/)).toBeVisible();
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await page.getByRole("button", { name: "Confirmar pedido" }).click();
  await expect(page.getByRole("heading", { name: "Pedido pendente" })).toBeVisible();
  const id = page.url().split("/").pop()!;
  await page.evaluate(() => window.__lume.cairConexao());
  await page.waitForTimeout(800);
  await page.evaluate((pedidoId) => window.__lume.soltarPedido(pedidoId, "confirmed"), id);
  await expect(page.getByText("Pedido confirmado.")).toBeVisible({ timeout: 10_000 });
  await page.reload();
  await expect(page.getByRole("heading", { name: /Recibo/ })).toBeVisible();
});
