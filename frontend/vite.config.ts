import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Forward API calls to the backend during development so the frontend
      // can just call fetch("/api/...") without hardcoding a host.
      "/api": {
        target: "http://localhost:4001",
        changeOrigin: true,
      },
    },
  },
});
