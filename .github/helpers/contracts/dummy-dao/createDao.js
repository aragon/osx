const fs = require('fs/promises');
const path = require('path');
const IPFS = require('ipfs-http-client');
const {ethers} = require('ethers');

const activeContracts = require('../../../../active_contracts.json');
const networks = require('../../../../packages/contracts/networks.json');
const daoFacotryJson = require('../../../../packages/contracts/artifacts/contracts/factory/DAOFactory.sol/DAOFactory.json');
const gas = require('./estimateGas');

// call from root folder as : node .github/helpers/contracts/dummy-dao/createDao.js <network-name> <creator-wallet-priv-key> <erc20 for ERC20 DAOs & none for allowList DAOs>

async function createDao() {
  const args = process.argv.slice(2);
  const networkName = args[0];
  const privKey = args[1];
  const isERC20Voting = args[2];
  const provider = new ethers.providers.JsonRpcProvider(
    networks[networkName].url
  );
  const signer = new ethers.Wallet(privKey, provider);
  const activeFactory = activeContracts[networkName].DAOFactory;

  // initiate factory contract
  const daoFactoryAbi = daoFacotryJson.abi;
  const DAOFactoryContract = new ethers.Contract(
    activeFactory,
    daoFactoryAbi,
    signer
  );

  const votingTypes = ['ERC20', 'Allowlist'];
  let tx;
  let name = 'DummyDAO_' + votingTypes[isERC20Voting === 'erc20' ? 0 : 1];
  const daoName = name + `_Voting_` + new Date().getTime();

  const metadataObj = {
    name: daoName,
    description: 'Dummy Dao for QA and testing purposes...',
    parentDao: '',
    links: [
      {label: 'link01', url: 'https://link.01'},
      {label: 'link02', url: 'https://link.02'},
    ],
  };
  const client = IPFS.create('https://ipfs.infura.io:5001/api/v0');
  const cid = await client.add(JSON.stringify(metadataObj));

  console.log('ipfs cid', cid.path);

  let metadata = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(cid.path));
  let daoConfig = [daoName, metadata];
  let votingSettings = ['200000000000000000', '400000000000000000', '60000'];

  let overrides = await gas.setGasOverride(provider);
  console.log('Setting fee data:', overrides);
  console.log('Calling Dao Factory at:', DAOFactoryContract.address);

  if (isERC20Voting) {
    let tokenConfig = [
      '0x0000000000000000000000000000000000000000',
      name,
      'DMDT',
    ];
    let mintConfig = [[signer.address], ['10000000000000000000000']];

    tx = await DAOFactoryContract.createERC20VotingDAO(
      daoConfig,
      votingSettings,
      tokenConfig,
      mintConfig,
      '0x0000000000000000000000000000000000000000',
      overrides
    );
  } else {
    tx = await DAOFactoryContract.createAllowlistVotingDAO(
      daoConfig,
      votingSettings,
      [signer.address],
      '0x0000000000000000000000000000000000000000',
      overrides
    );
  }

  console.log(
    'waiting createDao tx:',
    tx.hash,
    'is ERC20 Voitng',
    isERC20Voting
  );

  const reciept = await tx.wait(1);

  const eventRegistry = reciept.events.find(event =>
    event.topics.includes(
      ethers.utils.id('DAORegistered(address,address,string)')
    )
  );
  const eventFactory = reciept.events.find(event =>
    event.topics.includes(ethers.utils.id('DAOCreated(string,address,address)'))
  );

  const daoAddressEncoded = eventRegistry.topics[1]; // dao address encoded
  const daoTokenEncoded = eventFactory.topics[1];
  const daoVotingEncoded = eventFactory.topics[2];

  let daoAddress = ethers.utils.defaultAbiCoder.decode(
    ['address'],
    daoAddressEncoded
  );
  let daoToken = ethers.utils.defaultAbiCoder.decode(
    ['address'],
    daoTokenEncoded
  );
  let daoVoting = ethers.utils.defaultAbiCoder.decode(
    ['address'],
    daoVotingEncoded
  );

  let resultObj = {
    tx: tx.hash,
    name: daoName,
    votingType: isERC20Voting === 'erc20' ? 'ERC20Voting' : 'AllowlistVoting',
    address: daoAddress[0],
    token: daoToken[0],
    voting: daoVoting[0],
  };

  console.log('writing results:', resultObj, 'to file.');

  // read file and make object
  const dummyDAOFile = await fs.readFile(path.join('./', 'dummy_daos.json'));
  let content = JSON.parse(dummyDAOFile.toString());

  // edit or add property
  if (!content[networkName]) content[networkName] = {};
  if (!content[networkName].dao) content[networkName].dao = {};
  if (
    !content[networkName].dao[
      isERC20Voting === 'erc20' ? 'ERC20Voting' : 'AllowlistVoting'
    ]
  ) {
    content[networkName].dao[
      isERC20Voting === 'erc20' ? 'ERC20Voting' : 'AllowlistVoting'
    ] = {};
  }
  content[networkName].dao[
    isERC20Voting === 'erc20' ? 'ERC20Voting' : 'AllowlistVoting'
  ] = resultObj;

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
