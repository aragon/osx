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
    return 'osx-contracts' + config.pageExtension;
  },
};
