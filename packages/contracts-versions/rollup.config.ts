import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import json from '@rollup/plugin-json';
import {join} from 'path';

export default [
  {
    input: 'npm/index.ts',
    plugins: [typescript({project: './tsconfig.json'}), json()],
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
