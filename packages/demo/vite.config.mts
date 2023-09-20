import { defineConfig } from 'vite';
import bin from 'vite-plugin-bin';

export default defineConfig({
  plugins: [bin()],
  build: {
    outDir: 'lib',
    sourcemap: true,
    lib: {
      formats: ['es'],
      entry: ['src/index.ts'],
      fileName: '[name]',
    },
  },
});
