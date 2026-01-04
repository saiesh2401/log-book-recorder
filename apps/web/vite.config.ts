import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['pdfjs-dist']
  },
  build: {
    target: 'esnext'
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5263",
        changeOrigin: true
      }
    }
  }
});
