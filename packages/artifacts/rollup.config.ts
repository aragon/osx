import json from '@rollup/plugin-json';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

export default [
  {
    input: ['index.ts'],
    plugins: [json(), typescript()],
    output: [
      {
        file: 'dist/bundle-cjs.js',
        format: 'cjs',
      },
      {
        file: 'dist/bundle-esm.js',
        format: 'es',
      },
    ],
  },
  {
    input: ['index.ts'],
    plugins: [json(), dts()],
    output: [
      {
        file: 'dist/bundle.d.ts',
        format: 'es',
      },
    ],
  },
];
