import json from '@rollup/plugin-json';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

export default [
  {
    input: ['artifacts.ts'],
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
    input: ['artifacts.ts'],
    plugins: [json(), dts()],
    output: [
      {
        file: 'dist/bundle.d.ts',
        format: 'es',
      },
    ],
  },
  {
    input: ['abi.ts'],
    plugins: [typescript()],
    output: [
      {
        file: 'dist/abi/bundle-cjs.js',
        format: 'cjs',
      },
      {
        file: 'dist/abi/bundle-esm.js',
        format: 'es',
      },
    ],
  },
  {
    input: ['abi.ts'],
    plugins: [json(), dts()],
    output: [
      {
        file: 'dist/abi/bundle.d.ts',
        format: 'es',
      },
    ],
  },
];
