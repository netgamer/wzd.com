import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import globalStyles from "./styles/main.css?raw";

const styleTag = document.createElement("style");
styleTag.textContent = globalStyles;
document.head.appendChild(styleTag);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
