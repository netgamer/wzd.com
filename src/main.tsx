import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import globalStyles from "./styles/main.css?raw";
import modernStyles from "./styles/modern-ui.css?raw";
import refinementStyles from "./styles/ui-refinement.css?raw";
import headerFlatStyles from "./styles/header-flat.css?raw";
import immersiveStyles from "./styles/immersive-effects.css?raw";
import myBoardsStyles from "./styles/my-boards-sidebar.css?raw";
import myBoardsOverrideStyles from "./styles/my-boards-sidebar-override.css?raw";
import hoverBoardRailStyles from "./styles/hover-board-rail.css?raw";
import "./ui/immersive-effects";
import "./ui/my-boards-sidebar";
import "./ui/mobile-board-switch-fix";

const styleTag = document.createElement("style");
styleTag.textContent = `${globalStyles}\n${modernStyles}\n${refinementStyles}\n${headerFlatStyles}\n${immersiveStyles}\n${myBoardsStyles}\n${myBoardsOverrideStyles}\n${hoverBoardRailStyles}`;
document.head.appendChild(styleTag);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
