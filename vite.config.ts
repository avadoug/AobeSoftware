import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Aobe WorkTrack',
        short_name: 'WorkTrack',
        description: 'Hours, mileage, and work records without the paperwork swamp.',
        theme_color: '#176b5b',
        background_color: '#f7f8f5',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        categories: ['productivity', 'business'],
        icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
      },
      devOptions: { enabled: true },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: { reporter: ['text', 'html'], exclude: ['src/main.tsx'] },
  },
});
