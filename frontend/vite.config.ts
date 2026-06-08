import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@hopegestion/shared-types': path.resolve(__dirname, '../shared/types/index.ts'),
    },
  },
  server: {
    proxy: {
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Sépare les vendors stables en chunks nommés et cachés indépendamment.
        // Sans ce split, toute mise à jour de l'app force le re-téléchargement de
        // l'intégralité du chunk index (522 kB). Avec le split, seul le chunk "app"
        // change (~60 kB gzip) — les vendors sont servis depuis le cache navigateur.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return;

          // Extrait le nom du package (gère les scoped packages @org/pkg)
          const m = id.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)/);
          const pkg = m?.[1];
          if (!pkg) return;

          // React core + router — stable, rarement mis à jour
          if (['react', 'react-dom', 'react-router', 'react-router-dom'].includes(pkg)) {
            return 'react-vendor';
          }
          // Animation — ~100 kB minifié, stable
          if (pkg === 'framer-motion') return 'motion-vendor';
          // Data fetching
          if (pkg === '@tanstack/react-query' || pkg === '@tanstack/query-core') {
            return 'query-vendor';
          }
          // Recharts est déjà auto-splitté par Vite via les pages lazy (CartesianChart,
          // PieChart, etc.) — on le laisse tel quel pour ne pas casser ce comportement.
        },
      },
    },
  },
})
