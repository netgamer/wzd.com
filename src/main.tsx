import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import globalStyles from "./styles/main.css?raw";
import modernStyles from "./styles/modern-ui.css?raw";
import refinementStyles from "./styles/ui-refinement.css?raw";
import headerFlatStyles from "./styles/header-flat.css?raw";

const styleTag = document.createElement("style");
styleTag.textContent = `${globalStyles}\n${modernStyles}\n${refinementStyles}\n${headerFlatStyles}`;
document.head.appendChild(styleTag);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
