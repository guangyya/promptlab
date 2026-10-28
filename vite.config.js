import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Relative assets work at a custom-domain root and at /repository/ on GitHub Pages.
export default defineConfig({ base: './', plugins: [react()], server: { host: '127.0.0.1', port: 4317, strictPort: true }, preview: { host: '127.0.0.1', port: 4317, strictPort: true } });
