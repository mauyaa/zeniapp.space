import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { compression } from 'vite-plugin-compression2'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_DEV_API_TARGET || 'http://localhost:4000'
  const isProd = mode === 'production'

  return {
    plugins: [
      react(),
      // Gzip + Brotli compression for production builds (explicit filenames to avoid duplicate emit warnings)
      ...(isProd
        ? [
            compression({ algorithm: 'gzip', threshold: 1024, filename: '[path][base].gz' }),
            compression({ algorithm: 'brotliCompress', threshold: 1024, filename: '[path][base].br' }),
          ]
        : []),
    ],

    // Optimise dependency pre-bundling — keeps cold start fast
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'framer-motion',
        'clsx',
        'tailwind-merge',
        'date-fns',
        'lucide-react',
        'socket.io-client',
      ],
    },

    build: {
      // Target modern browsers for smaller output
      target: 'es2020',
      // Enable CSS code splitting
      cssCodeSplit: true,
      // Slightly higher inline threshold for tiny assets
      assetsInlineLimit: 8192,
      rollupOptions: {
        output: {
          // Manual chunk splitting — vendor libs in separate, cacheable chunks
          manualChunks(id) {
            // React core
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
              return 'react-vendor'
            }
            // Router
            if (id.includes('node_modules/react-router') || id.includes('node_modules/@remix-run')) {
              return 'router-vendor'
            }
            // Animation libraries (heavy — isolate so they only load when needed)
            if (id.includes('node_modules/framer-motion')) {
              return 'animation-vendor'
            }
            if (id.includes('node_modules/gsap') || id.includes('node_modules/@gsap')) {
              return 'gsap-vendor'
            }
            // Map libraries
            if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) {
              return 'map-vendor'
            }
            // Socket.IO
            if (id.includes('node_modules/socket.io')) {
              return 'socket-vendor'
            }
            // Utility libraries
            if (
              id.includes('node_modules/date-fns') ||
              id.includes('node_modules/zod') ||
              id.includes('node_modules/clsx') ||
              id.includes('node_modules/tailwind-merge')
            ) {
              return 'utils-vendor'
            }
            // Icons
            if (id.includes('node_modules/lucide-react') || id.includes('node_modules/react-icons')) {
              return 'icons-vendor'
            }
          },
        },
      },
      // Report compressed sizes for accurate feedback
      reportCompressedSize: true,
    },

    server: {
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          ws: true,
        },
        // Backend serves uploaded files at /uploads; proxy so images load in dev
        '/uploads': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
