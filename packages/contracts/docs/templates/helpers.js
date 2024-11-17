const {version} = require('../../package.json');

module.exports['multisig-version'] = () => version;

module.exports['readme-path'] = opts => {
  return 'README.adoc';
};

module.exports['isLocalContract'] = (name, options) => {
  const allContracts = options.data.site.items
    .filter(output => output.nodeType === 'ContractDefinition')
    .map(contract => contract.name);

  return allContracts.includes(name);
};

module.exports['isAragonInherittedContract'] = (absolutePath, options) => {
  return absolutePath.startsWith('@aragon');
};

module.exports['getExternalLink'] = absolutePath => {
  if (absolutePath.startsWith('@aragon/osx-commons-contracts')) {
    return absolutePath.replace(
      '@aragon/osx-commons-contracts',
      'https://github.com/aragon/osx-commons/tree/main/contracts'
    );
  }

  return 'github.com';
};

// module.exports['isAragonInherittedContract1'] = contract => {
//   console.log(contract, 'oe');
// };

// module.exports['getExternalLink1'] = item => {
//   // console.log(item, 'oe');
// };

module.exports.names = params => params?.map(p => p.name).join(', ');

module.exports['typed-params'] = params => {
  return params
    ?.map(
      p =>
        `${p.type}${p.indexed ? ' indexed' : ''}${p.name ? ' ' + p.name : ''}`
    )
    .join(', ');
};

const slug = (module.exports.slug = str => {
  if (str === undefined) {
    throw new Error('Missing argument');
  }
  return str.replace(/\W/g, '-');
});

const linksCache = new WeakMap();

function getAllLinks(items) {
  if (linksCache.has(items)) {
    return linksCache.get(items);
  }
  const res = {};
  linksCache.set(items, res);

  // items only contain what is inside `src`.
  for (const item of items) {
    res[
      `xref-${item.anchor}`
    ] = `xref:${item.__item_context.page}#${item.anchor}`;
    res[
      slug(item.fullName)
    ] = `pass:normal[xref:${item.__item_context.page}#${item.anchor}[\`${item.fullName}\`]]`;
  }
  return res;
}

module.exports['with-prelude'] = opts => {
  const links = getAllLinks(opts.data.site.items);
  const contents = opts.fn();
  const neededLinks = contents
    .match(/\{[-._a-z0-9]+\}/gi)
    .map(m => m.replace(/^\{(.+)\}$/, '$1'))
    .filter(k => k in links);
  const prelude = neededLinks.map(k => `:${k}: ${links[k]}`).join('\n');
  return prelude + '\n' + contents;
};
