import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import json from '@rollup/plugin-json';

export default [
  {
    input: 'npm/index.ts',
    plugins: [typescript({project: './tsconfig.json'}), json()],
    output: {
      dir: 'dist',
      entryFileNames: '[name]-[format].js',
      format: 'esm',
      exports: 'named',
      chunkFileNames: 'chunks/[name]-[hash].js',
    },
  },
  {
    input: 'npm/index.ts',
    plugins: [dts()],
    output: {
      dir: 'dist',
      entryFileNames: 'bundle.d.ts',
      format: 'es',
    },
  },
];
