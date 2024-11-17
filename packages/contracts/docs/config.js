const path = require('path');
const fs = require('fs');

/** @type import('solidity-docgen/dist/config').UserConfig */
module.exports = {
  outputDir: 'docs/modules/api/pages',
  templates: 'docs/templates',
  exclude: ['mocks', 'test'],
  pageExtension: '.adoc',
  collapseNewlines: true,
  pages: (_, file, config) => {
    const sourcesDir = path.resolve(config.root, config.sourcesDir);
    let dir = path.resolve(config.root, file.absolutePath);

    return 'Multisig' + config.pageExtension;
  },
};
