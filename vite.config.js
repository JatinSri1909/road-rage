import { defineConfig } from 'vite';

export default defineConfig({
  // No base needed for local dev; set to '/neon-circuit/' if deploying to a subpath
  base: './',
  build: {
    target: 'esnext',
    // Each track/car chunk is loaded on demand, so the initial bundle stays small.
    // Vite handles the split automatically via dynamic import() in the registries.
    rollupOptions: {
      output: {
        // Hashed filenames bust mobile cache — no more renaming to v2/v3/v6
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]',
      },
    },
  },
});