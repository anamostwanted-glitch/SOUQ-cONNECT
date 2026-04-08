import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig({
    base: './',
    plugins: [
          react(), 
          tailwindcss(),
        ],
    build: {
          outDir: 'dist',
          emptyOutDir: true,
          rollupOptions: {
                  external: [
                            'better-sqlite3',
                            'express',
                            'compression',
                            'nodemailer',
                            'dotenv',
                            '@apollo/server',
                            '@as-integrations/express4',
                          ],
          },
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
