import { chmod, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import chalk from 'chalk';
import MagicString from 'magic-string';
import { type Logger, type Plugin } from 'vite';

type ShebangString = `#!${string}`;

interface Options {
  /**
   * Replace shebangs instead of simply preserving them.
   */
  shebang?: ShebangString | ((original: ShebangString) => ShebangString);
  /**
   * Make chunks with shebangs executable. Defaults to `true`.
   */
  executable?: boolean;
}

const SHEBANG_REGEXP = /^#!.*/u;
const PREFIX = chalk.cyan('[vite:bin]');

let logger: Logger;

/**
 * Preserve shebangs and make chunks with shebangs executable.
 */
export default (options?: Options): Plugin => {
  return {
    name: 'vite-plugin-bin',
    enforce: 'pre',
    transform: {
      /**
       * Try to get save the shebang before another plugin removes it.
       */
      order: 'pre',
      handler: (code) => {
        const match = code.match(SHEBANG_REGEXP);

        if (!match) return null;

        return {
          meta: { shebang: match[0] },
          code,
          map: null,
        };
      },
    },
    configResolved: function (config) {
      logger = {
        ...config.logger,
        info: (message, opts) => config.logger.info(`${PREFIX} ${chalk.green(message)}`, opts),
      };
    },
    renderChunk: {
      /**
       * Try to add the shebang back in after all other transformations.
       */
      order: 'post',
      handler: function (code, chunk) {
        /**
         * Find all the module IDs that contributed to this chunk.
         */
        const moduleIds = [...Object.keys(chunk.modules), ...(chunk.facadeModuleId ? [chunk.facadeModuleId] : [])];

        /**
         * Find the _last_ module that has a saved shebang.
         *
         * XXX: Hopefully, only one module ID is an entry module (has
         * `shebang` metadata). However, it's possible that an entry
         * module may import another module that is _also an entry module
         * with a shebang!_ If that happens, we use the last one and hope
         * it's the entry module for this chunk. That is probably the
         * case because we added the (poorly documented but probably
         * correct) `facadeModuleId` at the end, and if that's not right,
         * then the modules map seems to have the keys in reverse import
         * order.
         */
        let shebang = moduleIds.reduce<ShebangString | undefined>((result, moduleId) => {
          return this.getModuleInfo(moduleId)?.meta?.shebang ?? result;
        }, undefined);

        if (!shebang) return null;

        if (options?.shebang) {
          shebang = typeof options.shebang === 'function' ? options.shebang(shebang) : options.shebang;
        }

        const ms = new MagicString(code).prepend(`${shebang}\n`);

        return {
          code: ms.toString(),
          map: ms.generateMap({ hires: true }),
        };
      },
    },
    writeBundle: {
      /**
       * Make shebang-ed bundles executable after all is said and done.
       */
      order: 'post',
      sequential: true,
      handler: async function ({ dir }, bundle) {
        if (options?.executable === false) return;

        /**
         * XXX: Not sure why the output directory wouldn't be defined.
         */
        if (!dir) return;

        await Promise.all(
          Object.entries(bundle).map(async ([filename, chunk]) => {
            if (!('code' in chunk) || !chunk.code.startsWith('#!')) return;

            filename = resolve(dir, filename);
            const { mode } = await stat(filename);
            await chmod(filename, mode | 0o111);

            logger.info(`Added shebang and executable bits to "${chunk.fileName}".`);
          }),
        );
      },
    },
  };
};
