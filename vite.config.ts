import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  // Base path: sempre '/' (produção no GitHub Pages, dev no Firebase Hosting)
  base: '/',

  // Copiar 404.html para dist/ durante o build
  publicDir: 'public',
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        404: path.resolve(__dirname, '404.html'),
      },
      output: {
        manualChunks: {
          // React core e navegação
          'vendor-react': ['react', 'react-dom', 'react-router'],
          
          // Componentes UI (Radix)
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-popover',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs',
            '@radix-ui/react-alert-dialog',
          ],
          
          // Firebase (separado para cache independente)
          'vendor-firebase': [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/storage',
            'firebase/functions',
            'firebase/analytics',
          ],
          
          // Charting/visualização (carregado apenas em Reports)
          'vendor-charts': ['recharts'],
          
          // PDF generation (carregado apenas quando exportar)
          'vendor-pdf': ['jspdf', 'jspdf-autotable', 'html2canvas'],
          
          // DOMPurify (segurança)
          'vendor-security': ['dompurify'],
        },
      },
    },
    // Aumentar limite para evitar warning em chunks necessariamente grandes
    chunkSizeWarningLimit: 600,
  },
}))

