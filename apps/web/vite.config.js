// external
import react from "@vitejs/plugin-react";
import path from "path";
import { URL, fileURLToPath } from "url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(fileURLToPath(new URL(".", import.meta.url)), "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  server: {
    port: 3000,
    host: "0.0.0.0",
    proxy: {
      "/api/v1": {
        target: "http://127.0.0.1:9000",
        changeOrigin: true,
      },
    },
  },
});
