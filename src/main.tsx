import { createRoot } from "react-dom/client";
import App from "./App.tsx";
// Ola Maps (olamaps-web-sdk) is built on MapLibre GL and requires its base CSS
// for the map canvas/controls to render correctly.
import "maplibre-gl/dist/maplibre-gl.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
