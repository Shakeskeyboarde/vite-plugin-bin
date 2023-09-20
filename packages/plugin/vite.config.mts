import { readFile } from 'node:fs/promises';

import { defineConfig, type UserConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig(async (): Promise<UserConfig> => {
  const packageJson = await readFile('package.json', 'utf8').then(JSON.parse);
  const deps = Object.keys({
    ...packageJson.dependencies,
    ...packageJson.optionalDependencies,
    ...packageJson.peerDependencies,
  });

  return {
    plugins: [
      dts({
        include: ['src'],
        exclude: ['**/__*/**/*', '**/*.test.*', '**/*.spec.*', '**/*.stories.*'],
      }),
    ],
    build: {
      outDir: 'lib',
      sourcemap: true,
      minify: true,
      lib: {
        formats: ['es', 'cjs'],
        entry: ['src/index.ts'],
        fileName: '[name]',
      },
      rollupOptions: {
        external: [/^node:/u, new RegExp(`^(?:${deps.join('|')})(?:/|$)`, 'u')],
      },
    },
  };
});
