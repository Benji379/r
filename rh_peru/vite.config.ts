// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Esto lo hace disponible en tu red local
    port: 8422, // Esto hace que el servidor corra en el puerto 8422
  },
});