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
      // Handles root entry file of package
      build.onLoad({ filter: /(^index\.js$)/ }, () => {
        return {
          loader: 'jsx',
          contents: inputCode,
        };
      });

      build.onLoad({ filter: /.*/ }, async (args: any) => {
        // Check if the package is aldready fetched and if yes, cache it
        const cachedResult = await packageCache.getItem<esbuild.OnLoadResult>(args.path);

        if (cachedResult) {
          return cachedResult;
        }
      });

      // Handles css files
      build.onLoad({ filter: /.css$/ }, async (args: any) => {
        // Store the data in cache
        const { data, request } = await axios.get(args.path);

        const escapedCssSnippet = data.replace(/\n/g, '').replace(/"/g, '\\"').replace(/'/g, "\\'");
        const contents = `
            const style = document.createElement("style");
            style.innerText = '${escapedCssSnippet}';
            document.head.appendChild(style)
          `;

        const result: esbuild.OnLoadResult = {
          loader: 'jsx',
          contents,
          resolveDir: new URL('./', request.responseURL).pathname,
        };

        // Stored result in cache
        await packageCache.setItem(args.path, result);

        return result;
      });

      build.onLoad({ filter: /.*/ }, async (args: any) => {
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
