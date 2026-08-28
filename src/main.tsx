import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { hostPlatform } from "./platform";
import "./index.css";

document.documentElement.dataset.platform = hostPlatform();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
