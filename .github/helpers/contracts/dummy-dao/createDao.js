const fs = require('fs/promises');
const path = require('path');
const IPFS = require('ipfs-http-client');
const {ethers} = require('ethers');
const activeContracts = require('../../../../active_contracts.json');
const networks = require('../../../../packages/contracts/networks.json');
const daoFacotryJson = require('../../../../packages/contracts/artifacts/contracts/factory/GlobalDAOFactory.sol/GlobalDAOFactory.json');
const gas = require('./estimateGas');
const parseArgs = require('minimist');

async function createDao() {
  console.log('\n=== Staring DAO creation ===');

  const args = parseArgs(process.argv.slice(2));
  const daoJsonKey = args.daoKey;
  const networkName = args.network;
  const privKey = args.privKey;
  let packages = args.packages;

  const provider = new ethers.providers.JsonRpcProvider(
    networkName === 'localhost'
      ? 'http://127.0.0.1:8545'
      : networks[networkName].url
  );
  const signer = new ethers.Wallet(privKey, provider);
  const activeFactory =
    networkName === 'localhost'
      ? require('../../../../packages/contracts/deployments/localhost/GlobalDAOFactory.json')
          .address
      : activeContracts[networkName].DAOFactory;

  // initiate factory contract
  const daoFactoryAbi = daoFacotryJson.abi;
  const DAOFactoryContract = new ethers.Contract(
    activeFactory,
    daoFactoryAbi,
    signer
  );

  if (typeof packages === 'string') {
    const _packages = [packages];
    packages = _packages;
  }

  const packageTypeName = packages.reduce(
    (previousValue, currentValue) =>
      previousValue.slice(0, -7) + '_' + currentValue.slice(0, -7)
  );

  let name = 'DummyDAO_' + packageTypeName;
  const daoName = name + `_Voting_` + new Date().getTime();

  const metaObj = {
    name: daoName,
    description: 'Dummy Dao for QA and testing purposes...',
    parentDao: '',
    links: [
      {label: 'link01', url: 'https://link.01'},
      {label: 'link02', url: 'https://link.02'},
    ],
  };
  const client = IPFS.create('https://ipfs.infura.io:5001/api/v0');
  const cid = await client.add(JSON.stringify(metaObj));

  console.log('ipfs cid', cid.path);

  let metadata = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(cid.path));
  let daoConfig = [
    daoName,
    metadata,
    '0x0000000000000000000000000000000000000000',
  ];
  let votingConfig = ['200000000000000000', '400000000000000000', '60000'];
  let tokenConfig = [
    '0x0000000000000000000000000000000000000000',
    name,
    'DMDT',
  ];
  let mintConfig = [[signer.address], ['10000000000000000000000']];

  let overrides =
    networkName === 'localhost'
      ? {gasLimit: 30000000, gasPrice: 20000000000}
      : await gas.setGasOverride(provider);
  console.log('Setting fee data:', overrides);

  let packageStructs = [];
  let packageTypes = [];

  for (let index = 0; index < packages.length; index++) {
    const package = packages[index];
    packageTypes.push(package.slice(0, -7));
    const packageAddress =
      networkName === 'localhost'
        ? require(`../../../../packages/contracts/deployments/localhost/${package}.json`)
            .address
        : activeContracts[networkName][package];

    console.log('package', package, 'packageAddress', packageAddress);

    const isERC20Voting = package === 'ERC20VotingFactory' ? true : false;

    /*
    struct Package {
        address factoryAddress; // package deployer (factory) address, hopefully from APM
        bytes32[] PackagePermissions; // to be granted to DAO
        bytes32[] DAOPermissions; // Dao permission to be granted to package like: exec_role
        bytes args; // pre-determined value for stting up the package
    }
    */
    let packageParams;
    let packagePermissions;
    const DAOPermissions = [
      '0x63af41e89ba81155a6d0c671442336165410b87bcfffee4277673b048f3ff856',
    ];
    if (!isERC20Voting) {
      // encode Package (uint256, uint256, uint256, address[])
      packageParams = ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'uint256', 'uint256', 'address[]'],
        [votingConfig[0], votingConfig[1], votingConfig[2], [signer.address]]
      );

      // white list permissions
      packagePermissions = [
        '0x34179493ff3543eca4b827bc6719d1c88c0ce7b52c9a8a32967cb8b23d18def7',
        '0x7b1c084e648f2b7880dcc7c57d1e460cdc48c77cfeb2f1794850376d720c00dd',
        '0x88aa719609f728b0c5e7fb8dd3608d5c25d497efbb3b9dd64e9251ebba101508',
        '0x2d1966159c0f7fc976963ae5b9a8848ccf0746b84347640a98e38988ec402e4f',
      ];
    } else {
      // encode Package (VoteConfig, TokenFactory.TokenConfig, TokenFactory.MintConfig)
      packageParams = ethers.utils.defaultAbiCoder.encode(
        [
          'tuple(uint256,uint256,uint256)',
          'tuple(address,string,string)',
          'tuple(address[],uint256[])',
        ],
        [votingConfig, tokenConfig, mintConfig]
      );

      // erc20 permissions
      packagePermissions = [
        '0x88aa719609f728b0c5e7fb8dd3608d5c25d497efbb3b9dd64e9251ebba101508',
        '0x7b1c084e648f2b7880dcc7c57d1e460cdc48c77cfeb2f1794850376d720c00dd',
        '0x2d1966159c0f7fc976963ae5b9a8848ccf0746b84347640a98e38988ec402e4f',
      ];
    }

    const packageStruct = [
      packageAddress,
      packagePermissions,
      DAOPermissions,
      packageParams,
    ];

    packageStructs.push(packageStruct);
  }

  console.log('calling contract with: ', daoConfig, packageStructs);

  const tx = await DAOFactoryContract.createDAOWithPackages(
    daoConfig,
    packageStructs,
    overrides
  );

  console.log('waiting createDao tx:', tx.hash);

  const reciept = await tx.wait();

  console.log('events', reciept.events);
  console.log(
    'looking for events',
    ethers.utils.id('PackageCreated(address,address)'),
    ethers.utils.id('TokenCreated(string,address,address,address)')
  );

  let daoPackages = {
    dao: '',
    packages: [],
    tokens: [],
  };
  for (let index = 0; index < reciept.events.length; index++) {
    const event = reciept.events[index];
    if (
      event.topics.includes(ethers.utils.id('PackageCreated(address,address)'))
    ) {
      const daoAddressEncoded = event.topics[1]; // dao address encoded
      const daoVotingEncoded = event.topics[2]; // package address
      let daoAddress = ethers.utils.defaultAbiCoder.decode(
        ['address'],
        daoAddressEncoded
      );
      let daoVoting = ethers.utils.defaultAbiCoder.decode(
        ['address'],
        daoVotingEncoded
      );
      daoPackages.dao = daoAddress[0];
      daoPackages.packages = [...daoPackages.packages, daoVoting[0]];
    }

    let daoTokenEncoded =
      '0x0000000000000000000000000000000000000000000000000000000000000000';

    if (
      event.topics.includes(
        ethers.utils.id('TokenCreated(string,address,address,address)')
      )
    ) {
      daoTokenEncoded = event.topics[1];
      let daoToken = ethers.utils.defaultAbiCoder.decode(
        ['address'],
        daoTokenEncoded
      );
      daoPackages.tokens = [...daoPackages.tokens, daoToken[0]];
    }
  }

  let resultObj = {
    tx: tx.hash,
    name: daoName,
    votingType: packageTypes,
    address: daoPackages.dao,
    token: daoPackages.tokens,
    packages: daoPackages.packages,
  };

  console.log('writing results:', resultObj, 'to file.');
  // read file and make object
  const dummyDAOFile = await fs.readFile(path.join('./', 'dummy_daos.json'));
  let content = JSON.parse(dummyDAOFile.toString());

  // edit or add property
  if (!content[networkName]) content[networkName] = {};
  if (!content[networkName][daoJsonKey]) content[networkName][daoJsonKey] = {};
  content[networkName][daoJsonKey] = resultObj;

  //write file
  await fs.writeFile(
    path.join('./', 'dummy_daos.json'),
    JSON.stringify(content, null, 2)
  );

  console.log('done!');
}

createDao()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
