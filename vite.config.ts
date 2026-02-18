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

  // GitHub Pages deployment configuration
  // Development: base: '/' (para npm run dev)
  // Production: base: '/luisices/' (para npm run build)
  // IMPORTANTE: Substitua 'luisices' pelo nome do seu repositório GitHub!
  base: command === 'serve' ? '/' : '/luisices/',

  // Copiar 404.html para dist/ durante o build
  publicDir: 'public',
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        404: path.resolve(__dirname, '404.html'),
      },
    },
  },
}))

