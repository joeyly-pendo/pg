import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    watch: process.env.POLLING ? { usePolling: true, interval: 300 } : undefined,
    proxy: { "/api": process.env.API_URL ?? "http://localhost:4000" },
  },
});
