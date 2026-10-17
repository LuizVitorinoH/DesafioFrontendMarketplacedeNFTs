import { expect, test } from "@playwright/test";
import { ANA, entrar, preparar } from "./apoio";

async function revisar(page: import("@playwright/test").Page) {
  await page.goto("/nfts/ape-01");
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await page.getByRole("link", { name: "Ir para pagamento" }).click();
  await page.getByLabel("Documento").fill("12345678901");
  await page.getByLabel("Carteira").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Conectar" }).click();
  await expect(page.getByText(/Conectada em/)).toBeVisible();
  await page.getByRole("button", { name: "Revisar pedido" }).click();
}

test("compra confirmada do catálogo ao recibo @mobile", async ({ page }) => {
  await preparar(page, "pagamento-confirmado");
  await entrar(page, ANA);
  await revisar(page);
  await page.getByRole("button", { name: "Confirmar pedido" }).click();
  await expect(page.getByRole("heading", { name: /Recibo/ })).toBeVisible();
  await expect(page.getByText("1.8400 ETH").first()).toBeVisible();
});

test("recusa, clique repetido e timeout com a mesma chave", async ({ page }) => {
  test.setTimeout(90_000);
  await preparar(page, "pagamento-recusado");
  await entrar(page, ANA);
  await revisar(page);
  await page.getByRole("button", { name: "Confirmar pedido" }).click();
  await expect(page.getByRole("heading", { name: "Pagamento recusado" })).toBeVisible();
  await page.goto("/carrinho");
  await expect(page.getByRole("link", { name: "Óculos verde" })).toBeVisible();

  await page.context().clearCookies();
  await preparar(page, "padrao");
  await entrar(page, ANA);
  await page.goto("/nfts/ape-04");
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  const pedidos: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && req.url().includes("/api/orders")) {
      pedidos.push(req.headers()["idempotency-key"] ?? "");
    }
  });
  await page.getByRole("link", { name: "Ir para pagamento" }).click();
  await page.getByLabel("Documento").fill("12345678901");
  await page.getByLabel("Carteira").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Conectar" }).click();
  await expect(page.getByText(/Conectada em/)).toBeVisible();
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  const confirmar = page.getByRole("button", { name: "Confirmar pedido" });
  await confirmar.dblclick();
  await expect(page.getByRole("heading", { name: /Recibo/ })).toBeVisible();
  expect(new Set(pedidos).size).toBe(1);

  await preparar(page, "timeout-pedido");
  await entrar(page, ANA);
  await page.goto("/nfts/ape-05");
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  const chaves: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && req.url().includes("/api/orders")) {
      chaves.push(req.headers()["idempotency-key"] ?? "");
    }
  });
  await page.getByRole("link", { name: "Ir para pagamento" }).click();
  await page.getByLabel("Documento").fill("12345678901");
  await page.getByLabel("Carteira").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Conectar" }).click();
  await expect(page.getByText(/Conectada em/)).toBeVisible();
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await page.getByRole("button", { name: "Confirmar pedido" }).click();
  await expect(page.getByRole("heading", { name: /Recibo|Pedido pendente/ })).toBeVisible({ timeout: 20_000 });
  expect(chaves.length).toBeGreaterThanOrEqual(2);
  expect(chaves[0]).toBe(chaves[1]);
});
