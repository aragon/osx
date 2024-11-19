const path = require('path');
const fs = require('fs');

const {version, repository} = require('../package.json');

const helpers = require(path.resolve(__dirname, './templates/helpers'));

// overwrite the functions.
helpers.version = () => version;
helpers.githubURI = () => repository.url;

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
