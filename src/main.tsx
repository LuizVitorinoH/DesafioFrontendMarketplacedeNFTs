import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const params = new URLSearchParams(window.location.search);
if (params.get("reset") === "1") {
  localStorage.removeItem("lume.dados");
  localStorage.removeItem("lume.sessao");
  localStorage.removeItem("lume.visitante");
  sessionStorage.clear();
}
const cenario = params.get("cenario");
if (cenario) localStorage.setItem("lume.cenario", cenario);

async function iniciar() {
  if (import.meta.env.VITE_ENABLE_MSW !== "false") {
    const { worker } = await import("./mocks/browser");
    await worker.start({
      onUnhandledRequest: "bypass",
      serviceWorker: { url: "/mockServiceWorker.js" },
    });
  }
  const { App } = await import("./app");
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void iniciar();
