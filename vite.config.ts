import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // your vite dev server port
    proxy: {
      // proxy any request starting with /api to the backend
      "/api": {
        target: "http://localhost:5174",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
