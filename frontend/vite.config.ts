import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }
          if (id.includes("node_modules/@ant-design/icons")) {
            return "ant-icons";
          }
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/react-router-dom") ||
            id.includes("node_modules/history") ||
            id.includes("node_modules/scheduler") ||
            id.includes("node_modules/zustand")
          ) {
            return "react-vendor";
          }
          if (id.includes("node_modules/axios")) {
            return "axios";
          }
          return undefined;
        }
      }
    }
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true
      }
    }
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts"
  }
});
