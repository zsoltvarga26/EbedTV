import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // LAN-ról is elérhető (pl. http://192.168.x.x:5173)
    port: 5173,
  },
});
