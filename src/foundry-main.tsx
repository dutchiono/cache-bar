import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Launchpad from "./pages/Launchpad";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Launchpad />
  </StrictMode>,
);
