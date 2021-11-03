const postcss = require('rollup-plugin-postcss');

// TODO: prevent assignment workaround if postcss is being bundled
module.exports = {
  rollup(config) {
    config.plugins.push(
      postcss({
        config: {
          path: './postcss.config.js',
        },
        extensions: ['.css'],
        minimize: true,
        inject: {
          insertAt: 'top',
        },
      })
    );
    return config;
  },
};
