import * as esbuild from 'esbuild-wasm';

interface Args {
  importer: string;
  namespace: string;
  path: string;
  resolveDir: string;
}

export const unpkgPathPlugin = () => {
  return {
    name: 'unpkg-path-plugin',
    setup(build: esbuild.PluginBuild) {
      /**
       * @onRESOLVE
       */
      // Handles root entry file of package
      build.onResolve({ filter: /(^index\.js$)/ }, () => {
        return { namespace: 'a', path: 'index.js' };
      });

      // Handles relative paths imported in packages
      build.onResolve({ filter: /^\.+\// }, (args: any) => {
        return {
          namespace: 'a',
          path: new URL(args.path, `https://unpkg.com${args.resolveDir}/`).href,
        };
      });

      // Handles main file of package
      build.onResolve({ filter: /.*/ }, async (args: any) => {
        return {
          namespace: 'a',
          path: `https://unpkg.com/${args.path}`,
        };
      });
    },
  };
};
