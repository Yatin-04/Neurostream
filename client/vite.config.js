import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,

    // Proxy /api requests to the signaling/TURN credential server
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },

    // Required for SharedArrayBuffer (WASM-based inference)
    // These headers enable cross-origin isolation needed by
    // onnxruntime-web and MediaPipe running in Web Workers.
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
});
