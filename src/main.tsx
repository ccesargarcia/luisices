
import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./styles/index.css";

// Trata erro de chunk desatualizado após novos deploys
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(<App />);
