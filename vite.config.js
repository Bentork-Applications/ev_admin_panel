import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // ⬇⬇ Increase bundle size limit here
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'EMPTY_BUNDLE') return;
        warn(warning);
      },
            output:{
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        return id.toString().split('node_modules/')[1].split('/')[0].toString();
                    }
                    // chunkSizeWarningLimit: 10000 // 
                }
            }
        }
  }
});