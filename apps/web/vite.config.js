// external
import react from "@vitejs/plugin-react";
import path from "path";
import { URL, fileURLToPath } from "url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@components": path.resolve(fileURLToPath(new URL(".", import.meta.url)), "src/components"),
      "@constants": path.resolve(fileURLToPath(new URL(".", import.meta.url)), "src/constants"),
      "@contexts": path.resolve(fileURLToPath(new URL(".", import.meta.url)), "src/contexts"),
      "@hooks": path.resolve(fileURLToPath(new URL(".", import.meta.url)), "src/hooks"),
      "@lib": path.resolve(fileURLToPath(new URL(".", import.meta.url)), "src/lib"),
      "@pages": path.resolve(fileURLToPath(new URL(".", import.meta.url)), "src/pages"),
      "@routes": path.resolve(fileURLToPath(new URL(".", import.meta.url)), "src/routes"),
      "@services": path.resolve(fileURLToPath(new URL(".", import.meta.url)), "src/services"),
      "@store": path.resolve(fileURLToPath(new URL(".", import.meta.url)), "src/store"),
      "@styles": path.resolve(fileURLToPath(new URL(".", import.meta.url)), "src/styles"),
      "@utils": path.resolve(fileURLToPath(new URL(".", import.meta.url)), "src/utils"),
      "@schemas": path.resolve(fileURLToPath(new URL(".", import.meta.url)), "src/schemas"),
      "@shared-hooks": path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../../shared/hooks/src"),
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
        cookieDomainRewrite: "localhost",
      },
      "/socket.io/": {
        target: "http://127.0.0.1:9000",
        changeOrigin: true,
        ws: true,
        cookieDomainRewrite: "localhost",
      },
    },
  },
});
