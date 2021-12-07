const images = require('@rollup/plugin-image');
const postcss = require('rollup-plugin-postcss');
const replace = require('@rollup/plugin-replace');

module.exports = {
  rollup(config, opts) {
    // suppress prevent assignment warning
    config.plugins = config.plugins.map(plugin =>
      plugin.name === 'replace'
        ? replace({
            'process.env.NODE_ENV': JSON.stringify(opts.env),
            preventAssignment: true,
          })
        : plugin
    );

    // postcss config
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

    // plugin for bundling images
    config.plugins = [
      images({include: ['**/*.png', '**/*.jpg', '**/*.svg']}),
      ...config.plugins,
    ];
    return config;
  },
};
