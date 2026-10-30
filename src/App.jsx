import { useEffect } from "react";
import AppRoutes from "./routes/AppRoutes";

export default function App() {
  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.width = "100vw";
    document.body.style.height = "100vh";

    const rootElement = document.getElementById("root");
    if (rootElement) {
      rootElement.style.width = "100vw";
      rootElement.style.height = "100vh";
      rootElement.style.margin = "0";
      rootElement.style.padding = "0";
    }
  }, []);

  return <AppRoutes />;
}