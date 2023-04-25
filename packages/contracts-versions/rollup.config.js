import typescript from 'rollup-plugin-typescript2';

export default {
  input: './npm/index.ts',
  output: [
    {
      file: './dist/index.js',
      format: 'cjs',
    },
    {
      file: './dist/index.esm.js',
      format: 'esm',
    },
  ],
  plugins: [typescript()],
};
