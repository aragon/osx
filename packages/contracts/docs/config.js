const path = require('path');
const fs = require('fs');

const { version, repository } = require('../package.json');

const helpers = require(path.resolve(__dirname, './templates/helpers'));

// overwrite the functions.
helpers.version = () => version;
helpers.githubURI = () => repository.url;
helpers.readmePath = opts => {
  return 'src/' + opts.data.root.id.replace(/\.adoc$/, '') + '/README.adoc';
};

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
    while (dir.startsWith(sourcesDir)) {
      dir = path.dirname(dir);
      if (fs.existsSync(path.join(dir, 'README.adoc'))) {
        return path.relative(sourcesDir, dir) + config.pageExtension;
      }
    }
  },
};
