import { fileURLToPath, URL } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    'import.meta.env.VITE_BRAND_ASSET_VERSION': JSON.stringify(
      process.env.VITE_BRAND_ASSET_VERSION ?? Date.now().toString(),
    ),
  },
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
});
