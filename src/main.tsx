import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupOnlineListener } from "./lib/sync-queue";

// Initialize online/offline sync listener
setupOnlineListener();

createRoot(document.getElementById("root")!).render(<App />);
