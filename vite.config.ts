
import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { createHtmlPlugin } from 'vite-plugin-html'

export default defineConfig(({ command, mode }) => {
  // New Relic snippets
  const newRelicDev = `<script type="text/javascript">
;window.NREUM||(NREUM={});NREUM.init={distributed_tracing:{enabled:true},performance:{capture_measures:true},browser_consent_mode:{enabled:false},privacy:{cookies_enabled:true},ajax:{deny_list:[\"bam.nr-data.net\"],capture_payloads:'none'}};

;NREUM.loader_config={accountID:\"512515\",trustKey:\"512515\",agentID:\"1589200633\",licenseKey:\"d0981b3d54\",applicationID:\"1589200633\"};
;NREUM.info={beacon:\"bam.nr-data.net\",errorBeacon:\"bam.nr-data.net\",licenseKey:\"d0981b3d54\",applicationID:\"1589200633\",sa:1};
;/*! For license information please see nr-loader-spa-1.310.1.min.js.LICENSE.txt */
(...)</script>`;

  const newRelicProd = `<script type="text/javascript">
;window.NREUM||(NREUM={});NREUM.init={distributed_tracing:{enabled:true},performance:{capture_measures:true},browser_consent_mode:{enabled:false},privacy:{cookies_enabled:true},ajax:{deny_list:[\"bam.nr-data.net\"],capture_payloads:'none'}};

;NREUM.loader_config={accountID:\"512515\",trustKey:\"512515\",agentID:\"1589200643\",licenseKey:\"d0981b3d54\",applicationID:\"1589200643\"};
;NREUM.info={beacon:\"bam.nr-data.net\",errorBeacon:\"bam.nr-data.net\",licenseKey:\"d0981b3d54\",applicationID:\"1589200643\",sa:1};
;/*! For license information please see nr-loader-spa-1.310.1.min.js.LICENSE.txt */
(...)</script>`;

  return {
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    },
    plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    createHtmlPlugin({
      inject: {
        data: {
          newrelic: mode === 'production' ? newRelicProd : newRelicDev,
        },
        tags: [
          {
            injectTo: 'head',
            tag: 'raw',
            children: mode === 'production' ? newRelicProd : newRelicDev,
          },
        ],
      },
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Luisices - Papelaria Personalizada',
        short_name: 'Luisices',
        description: 'Sistema de gestão para papelaria personalizada',
        theme_color: '#667eea',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 dias
              },
            },
          },
        ],
      },
    }),
  ],
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
  };
});

