import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../dist/webview',
    emptyOutDir: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        'create-script': path.resolve(__dirname, './src/createScriptMain.tsx')
      },
      output: {
        format: 'iife',
        name: 'CreateScriptApp',
        entryFileNames: 'create-script.js',
        chunkFileNames: '[name].js',
        assetFileNames: 'create-script.css'
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});