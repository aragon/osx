const fs = require('fs/promises');
const path = require('path');
const IPFS = require('ipfs-http-client');
const {ethers} = require('ethers');
const activeContracts = require('../../../../active_contracts.json');
const networks = require('../../../../packages/contracts/networks.json');
const daoFacotryJson = require('../../../../packages/contracts/artifacts/contracts/factory/DAOFactory.sol/DAOFactory.json');

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

  const votings = ['ERC20', 'Whitelist'];
  let tx;
  const name = 'DummyDAO_' + votings[isERC20Voting === 'erc20' ? 0 : 1];
  const daoName = name + `_Voting`;

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

  const metadata = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(cid.path));
  const daoConfig = [daoName, metadata];
  const votingSettings = ['200000000000000000', '400000000000000000', '60000'];

  if (isERC20Voting) {
    const tokenConfig = [
      '0x0000000000000000000000000000000000000000',
      name,
      'DMDT',
    ];
    const mintConfig = [[signer.address], ['10000000000000000000000']];
    tx = await DAOFactoryContract.newERC20VotingDAO(
      daoConfig,
      votingSettings,
      tokenConfig,
      mintConfig,
      '0x0000000000000000000000000000000000000000'
    );
  } else {
    tx = await DAOFactoryContract.newWhitelistVotingDAO(
      daoConfig,
      votingSettings,
      [signer.address],
      '0x0000000000000000000000000000000000000000'
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
      ethers.utils.id('NewDAORegistered(address,address,address,string)')
    )
  );
  const eventFactory = reciept.events.find(event =>
    event.topics.includes(ethers.utils.id('DAOCreated(string,address,address)'))
  );

  const daoAddressEncoded = eventRegistry.topics[1]; // dao address encoded
  const daoTokenEncoded = eventFactory.topics[1];
  const daoVotingEncoded = eventFactory.topics[2];

  const daoAddress = ethers.utils.defaultAbiCoder.decode(
    ['address'],
    daoAddressEncoded
  );
  const daoToken = ethers.utils.defaultAbiCoder.decode(
    ['address'],
    daoTokenEncoded
  );
  const daoVoting = ethers.utils.defaultAbiCoder.decode(
    ['address'],
    daoVotingEncoded
  );

  const resultObj = {
    tx: tx.hash,
    name: daoName,
    votingType: isERC20Voting === 'erc20' ? 'ERC20Voting' : 'WhitelistVoting',
    address: daoAddress[0],
    token: daoToken[0],
    voting: daoVoting[0],
  };

  console.log('writing results:', resultObj, 'to file.');

  // read file and make object
  const dummyDAOFile = await fs.readFile(path.join('./', 'dummy_daos.json'));
  let content = JSON.parse(dummyDAOFile.toString());
  // edit or add property
  content[networkName].dao[
    isERC20Voting === 'erc20' ? 'ERC20Voting' : 'WhitelistVoting'
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
