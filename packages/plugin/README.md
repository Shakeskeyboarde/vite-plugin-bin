# vite-plugin-bin

Use Vite to bundle executable scripts by preserving shebangs and setting chunk executable bits.

A best attempt is made to preserve shebangs from the entry file of each chunk. However, mapping entry module IDs to output chunks is poorly documented. If this plugin is not working for you, please open an issue with a minimal reproduction.

After chunks are written to disk, any that contain a shebang will have their executable bit set, unless the `executable` option is set to false.

## Install

```sh
npm install --save-dev vite-plugin-bin
```

## Usage

In your Vite config.

```ts
import bin from 'vite-plugin-bin';

export default defineConfig({
  plugins: [bin()],
});
```

## Options

- `shebang`
  - Type: `string | ((original: string) => string)`
  - Use a new shebang instead of preserving the original.
- `executable`
  - Type: `boolean`
  - Default: `true`
  - Set the executable bits on chunks that contain a shebang.
