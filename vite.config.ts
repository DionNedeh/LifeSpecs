import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/LifeSpecs/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.svg'],
      manifest: {
        name: 'LifeSpecs',
        short_name: 'LifeSpecs',
        description: 'An offline-first cheat sheet for home and vehicle specs.',
        theme_color: '#23423a',
        background_color: '#f7f3ea',
        display: 'standalone',
        start_url: '/LifeSpecs/',
        scope: '/LifeSpecs/',
        icons: [
          {
            src: 'icons/lifespecs.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: 'icons/apple-touch-icon.svg',
            sizes: '180x180',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,webmanifest}'],
        navigateFallback: '/LifeSpecs/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  test: {
    environment: 'node',
    globals: true
  }
});
