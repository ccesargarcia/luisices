import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => {
  return {
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    },
    plugins: [
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
      target: 'es2022',
      cssCodeSplit: true,
      minify: 'esbuild',
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          404: path.resolve(__dirname, '404.html'),
        },
        output: {
          // Vite 8 / rolldown expects manualChunks to be a function.
          manualChunks(id: string) {
            if (!id.includes('/node_modules/')) return;

            const pkgPath = id.split('/node_modules/')[1];
            if (!pkgPath) return;

            const pkgName = pkgPath.startsWith('@')
              ? pkgPath.split('/').slice(0, 2).join('/')
              : pkgPath.split('/')[0];

            switch (pkgName) {
              // React core e navegação
              case 'react':
              case 'react-dom':
              case 'react-router':
                return 'vendor-react';

              // Componentes UI (Radix)
              case '@radix-ui/react-dialog':
              case '@radix-ui/react-select':
              case '@radix-ui/react-popover':
              case '@radix-ui/react-dropdown-menu':
              case '@radix-ui/react-tabs':
              case '@radix-ui/react-alert-dialog':
                return 'vendor-ui';

              // Firebase (separado para cache independente)
              case 'firebase':
                return 'vendor-firebase';

              // Charting/visualização (carregado apenas em Reports)
              case 'recharts':
                return 'vendor-charts';

              // PDF generation (carregado apenas quando exportar)
              case 'jspdf':
              case 'jspdf-autotable':
              case 'html2canvas':
                return 'vendor-pdf';

              // DOMPurify (segurança)
              case 'dompurify':
                return 'vendor-security';

              // Sentry Observability
              case '@sentry/react':
              case '@sentry/core':
              case '@sentry/browser':
                return 'vendor-sentry';

              default:
                return;
            }
          },
        },
      },
      // Aumentar limite para evitar warning em chunks necessariamente grandes
      chunkSizeWarningLimit: 600,
    },
  };
});

