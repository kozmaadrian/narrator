import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// The build goes to ../static, which app.py serves. `npm run dev` proxies the API to a running `uv run app.py`.
export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: '../static',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:8765' },
  },
});
