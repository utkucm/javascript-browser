import * as esbuild from 'esbuild-wasm';
import axios from 'axios';
import localforage from 'localforage';

const packageCache = localforage.createInstance({
  name: 'packageCache',
});

(async () => {
  await packageCache.setItem('color', 'red');

  const color = await packageCache.getItem('color');
  console.log(color);
})();

export const unpkgPathPlugin = (inputCode: string) => {
  return {
    name: 'unpkg-path-plugin',
    setup(build: esbuild.PluginBuild) {
      build.onResolve({ filter: /.*/ }, async (args: any) => {
        console.log('onResolve', args);
        if (args.path === 'index.js') {
          return { path: args.path, namespace: 'a' };
        }

        if (args.path.includes('./') || args.path.includes('../')) {
          return {
            namespace: 'a',
            path: new URL(args.path, 'https://unpkg.com' + args.resolveDir + '/').href,
          };
        }

        return {
          namespace: 'a',
          path: `https://unpkg.com/${args.path}`,
        };
      });

      build.onLoad({ filter: /.*/ }, async (args: any) => {
        console.log('onLoad', args);

        if (args.path === 'index.js') {
          return {
            loader: 'jsx',
            contents: inputCode,
          };
        }

        // Check if the package is aldready fetched and if yes, cache it
        const cachedResult = await packageCache.getItem<esbuild.OnLoadResult>(args.path);

        if (cachedResult) {
          return cachedResult;
        }

        // Store the data in cache
        const { data, request } = await axios.get(args.path);

        const result: esbuild.OnLoadResult = {
          loader: 'jsx',
          contents: data,
          resolveDir: new URL('./', request.responseURL).pathname,
        };

        // Stored result in cache
        await packageCache.setItem(args.path, result);

        return result;
      });
    },
  };
};
