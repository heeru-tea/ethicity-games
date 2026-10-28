import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/game.css";
import { initBgm } from "./game/exam/sound";

initBgm();

createRoot(document.getElementById("root")!).render(<App />);
