import json from '@rollup/plugin-json';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

export default [
  {
    input: 'npm/index.ts',
    plugins: [typescript({project: './tsconfig.json'}), json()],
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
    input: 'npm/index.ts',
    plugins: [dts()],
    output: [
      {
        file: 'dist/bundle.d.ts',
        format: 'es',
      },
    ],
  },
];
