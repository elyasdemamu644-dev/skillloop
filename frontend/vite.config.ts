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
  build: {
    rollupOptions: {
      output: {
        // Split the largest third-party libraries into their own chunks: they
        // change far less often than app code, so browsers keep them cached
        // across deploys and the entry chunk stays small.
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-socket": ["socket.io-client"],
        },
      },
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
