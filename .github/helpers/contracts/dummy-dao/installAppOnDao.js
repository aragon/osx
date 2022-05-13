const fs = require('fs/promises');
const fetch = require('node-fetch');
const path = require('path');
const IPFS = require('ipfs-http-client');
const {ethers} = require('ethers');
const networks = require('../../../../packages/contracts/networks.json');
const Erc20VotingJson = require('../../../../packages/contracts/artifacts/contracts/votings/ERC20/ERC20Voting.sol/ERC20Voting.json');
const WhiteVotingJson = require('../../../../packages/contracts/artifacts/contracts/votings/whitelist/WhitelistVoting.sol/WhitelistVoting.json');
const ERC156Json = require('../../../../packages/contracts/artifacts/contracts/core/erc165/ERC165.sol/ERC165.json');
const dummyDaos = require('../../../../dummy_daos.json');
const gas = require('./estimateGas');
const parseArgs = require('minimist');

async function install() {
  console.log('\n=== Staring A Proposal on a DAO ===');

  const args = parseArgs(process.argv.slice(2));

  const daoJsonKey = args.daoKey;
  const networkName = args.network;
  const privKey = args.privKey;
  const package = args.package;

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
  // const daoFactoryAbi = daoFacotryJson.abi;
  // const DAOFactoryContract = new ethers.Contract(
  //   activeFactory,
  //   daoFactoryAbi,
  //   signer
  // );

  const daoAddress = dummyDaos[networkName][daoJsonKey].address;
  const votingAddress = dummyDaos[networkName][daoJsonKey].packages[0];

  console.log('votingAddresses', votingAddress);

  // metadata
  const metaObj = {
    name: 'Dummy Proposal Install app',
    description: 'Dummy Install app proposal for QA and testing purposes...',
    links: [
      {label: 'link01', url: 'https://link.01'},
      {label: 'link02', url: 'https://link.02'},
    ],
  };
  const client = IPFS.create('https://ipfs.infura.io:5001/api/v0');
  const cid = await client.add(JSON.stringify(metaObj));

  console.log('ipfs cid', cid.path);

  let metadata = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(cid.path));

  // action
  const packageAddress =
    networkName === 'localhost'
      ? require(`../../../../packages/contracts/deployments/localhost/WhiteListFactory.json`)
          .address
      : activeContracts[networkName][package];

  const packageParams = ethers.utils.defaultAbiCoder.encode(
    ['uint256', 'uint256', 'uint256', 'address[]'],
    ['200000000000000000', '400000000000000000', '60000', [signer.address]]
  );

  const DAOPermissions = [
    '0x63af41e89ba81155a6d0c671442336165410b87bcfffee4277673b048f3ff856',
  ];

  // white list permissions
  const packagePermissions = [
    '0x34179493ff3543eca4b827bc6719d1c88c0ce7b52c9a8a32967cb8b23d18def7',
    '0x7b1c084e648f2b7880dcc7c57d1e460cdc48c77cfeb2f1794850376d720c00dd',
    '0x88aa719609f728b0c5e7fb8dd3608d5c25d497efbb3b9dd64e9251ebba101508',
    '0x2d1966159c0f7fc976963ae5b9a8848ccf0746b84347640a98e38988ec402e4f',
  ];

  const packageStruct = [
    packageAddress,
    packagePermissions,
    DAOPermissions,
    packageParams,
  ];

  console.log('packageStruct', packageStruct);

  // prepare action
  // prepare permission action  =  grant(address _where, address _who, bytes32 _role) on DAO to factroy
  let AclABI = ['function grant(address _where, address _who, bytes32 _role)'];
  let aclIface = new ethers.utils.Interface(AclABI);
  let aclEncoded = aclIface.encodeFunctionData('grant', [
    daoAddress,
    activeFactory,
    '0x79e553c6f53701daa99614646285e66adb98ff0fcc1ef165dd2718e5c873bee6', // root_role
  ]);

  // prepare install action
  let ABI = [
    'function installPckagesOnDAO(address dao, tuple(address,bytes32[],bytes32[],bytes) package)',
  ];
  let iface = new ethers.utils.Interface(ABI);
  let encoded = iface.encodeFunctionData('installPckagesOnDAO', [
    daoAddress,
    packageStruct,
  ]);

  const actions = [
    [daoAddress, '0', aclEncoded],
    [activeFactory, '0', encoded],
  ];

  let overrides = await gas.setGasOverride(provider);

  // get voting type via interface
  erc165 = new ethers.Contract(votingAddress, ERC156Json.abi, signer);

  const isERC20Voting = await erc165.supportsInterface('0x27a0eec0');

  console.log('isERC20Voting', isERC20Voting);

  // initiate Voting contract
  let VotingContract;
  if (isERC20Voting) {
    VotingContract = new ethers.Contract(
      votingAddress,
      Erc20VotingJson.abi,
      signer
    );
  } else {
    VotingContract = new ethers.Contract(
      votingAddress,
      WhiteVotingJson.abi,
      signer
    );
  }

  let proposalTx = await VotingContract.newVote(
    metadata,
    actions,
    0,
    0,
    true,
    2,
    overrides
  ); // vote Yea and execute

  await proposalTx.wait();

  const resultObj = {
    proposalTx: proposalTx.hash,
    metadata: metaObj,
    dao: daoAddress,
  };

  console.log('writing results:', resultObj, 'to file.', '\n');
  // read file and make object
  const dummyDAOFile = await fs.readFile(path.join('./', 'dummy_daos.json'));
  let content = JSON.parse(dummyDAOFile.toString());

  // edit or add property
  if (!content[networkName][daoJsonKey].installAppProposal) {
    content[networkName][daoJsonKey].installAppProposal = {};
  }
  content[networkName][daoJsonKey].installAppProposal = resultObj;
  //write file
  await fs.writeFile(
    path.join('./', 'dummy_daos.json'),
    JSON.stringify(content, null, 2)
  );

  console.log('!Done');
}

install()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
