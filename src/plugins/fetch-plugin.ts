import * as esbuild from 'esbuild-wasm';
import axios from 'axios';
import localforage from 'localforage';

const packageCache = localforage.createInstance({
  name: 'packageCache',
});

export const fetchPlugin = (inputCode: string) => {
  return {
    name: 'fetch-plugin',
    setup(build: esbuild.PluginBuild) {
      build.onLoad({ filter: /.*/ }, async (args: any) => {
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