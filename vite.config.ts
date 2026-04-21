import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      manifest: {
        name: 'Souq Connect - AI Multi-Vendor MarketPlace Marketplace',
        short_name: 'SouqConnect',
        description: 'Professional Multi-Vendor MarketPlace trading platform powered by Gemini AI.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'https://picsum.photos/seed/connect-icon-192/192/192',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://picsum.photos/seed/connect-icon-512/512/512',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@main': path.resolve(__dirname, 'src/modules/main'),
      '@marketplace': path.resolve(__dirname, 'src/modules/marketplace'),
      '@chat': path.resolve(__dirname, 'src/modules/chat'),
      '@shared': path.resolve(__dirname, 'src/modules/shared'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: process.env.DISABLE_HMR !== 'true',
  },
  define: {
    'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY),
  },
});
