import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/upload":    { target: "http://localhost:5000", changeOrigin: true },
      "/transcribe":{ target: "http://localhost:5000", changeOrigin: true },
      "/render":    { target: "http://localhost:5000", changeOrigin: true },
      "/export":    { target: "http://localhost:5000", changeOrigin: true },
      "/files":     { target: "http://localhost:5000", changeOrigin: true },
      "/outputs":   { target: "http://localhost:5000", changeOrigin: true },
      "/health":    { target: "http://localhost:5000", changeOrigin: true },
      "/translate": { target: "http://localhost:5000", changeOrigin: true },
    },
  },
});
