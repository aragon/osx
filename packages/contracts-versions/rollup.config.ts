import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import json from '@rollup/plugin-json';
import copy from 'rollup-plugin-copy';

export default [
  {
    input: 'npm/index.ts',
    plugins: [
      typescript({project: './tsconfig.json'}),
      json(),
      copy({
        targets: [
          {
            src: 'versions/**/active_contracts.json',
            dest: 'dist/versions',
            rename: (name, extension, fullPath) => {
              if (fullPath) {
                const matchResult = fullPath.match(/versions\/(.+?)\//);
                if (matchResult) {
                  const versionName = matchResult[1];
                  return `${versionName}/active_contracts.json`;
                }
              }
              return name;
            },
          },
        ],
      }),
    ],
    output: [
      {
        dir: 'dist',
        entryFileNames: 'index-esm.js',
        format: 'esm',
        exports: 'named',
        sourcemap: true,
      },
      {
        dir: 'dist',
        entryFileNames: 'index-cjs.js',
        format: 'cjs',
        exports: 'named',
        sourcemap: true,
      },
    ],
  },
  {
    input: 'npm/index.ts',
    plugins: [dts(), json()],
    output: {
      file: 'dist/bundle.d.ts',
      format: 'es',
    },
  },
];
