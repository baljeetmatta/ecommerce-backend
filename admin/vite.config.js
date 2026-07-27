import react from "../frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import { defineConfig } from "../frontend/node_modules/vite/dist/node/index.js";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: fileURLToPath(new URL("../frontend/node_modules/react", import.meta.url)),
      "react-dom": fileURLToPath(new URL("../frontend/node_modules/react-dom", import.meta.url)),
      "lucide-react": fileURLToPath(new URL("../frontend/node_modules/lucide-react", import.meta.url)),
      recharts: fileURLToPath(new URL("../frontend/node_modules/recharts", import.meta.url))
    }
  },
  server: {
    port: 5174,
    fs: { allow: [".."] }
  },
  build: {
    outDir: "dist"
  }
});
