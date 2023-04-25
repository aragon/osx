import json from 'rollup-plugin-json';

export default {
  input: 'index.js',
  output: {
    dir: 'dist',
    format: 'cjs',
  },
  plugins: [json()],
};
