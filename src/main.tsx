import React from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App.js";
import "./components/RadialText/RadialText.css";
import "./styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
