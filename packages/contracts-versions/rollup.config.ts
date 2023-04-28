import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import json from '@rollup/plugin-json';

export default [
  {
    input: 'index.ts',
    plugins: [typescript({project: './tsconfig.json'}), json()],
    output: [
      {
        dir: 'dist',
        entryFileNames: 'index-esm.js',
        format: 'esm',
        exports: 'named',
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
      {
        dir: 'dist',
        entryFileNames: 'index-cjs.js',
        format: 'cjs',
        exports: 'named',
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    ],
  },
  {
    input: 'index.ts',
    plugins: [dts(), json()],
    output: {
      dir: 'dist',
      entryFileNames: 'bundle.d.ts',
      format: 'es',
    },
  },
];
