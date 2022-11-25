const fs = require('fs/promises');
const fetch = require('node-fetch');
const path = require('path');
const IPFS = require('ipfs-http-client');
const {ethers} = require('ethers');

const networks = require('../../../../packages/contracts/networks.json');
const TokenVotingJson = require('../../../../packages/contracts/artifacts/contracts/voting/token/TokenVoting.sol/TokenVoting.json');
const AllowVotingJson = require('../../../../packages/contracts/artifacts/contracts/voting/addresslist/AddresslistVoting.sol/AddresslistVoting.json');
const dummyDaos = require('../../../../dummy_daos.json');
const gas = require('./estimateGas');

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

async function proposal() {
  const args = process.argv.slice(2);
  const networkName = args[0];
  const privKey = args[1];
  const isTokenVoting = args[2] === 'token';
  const provider = new ethers.providers.JsonRpcProvider(
    networks[networkName].url
  );
  const signer = new ethers.Wallet(privKey, provider);

  const daoAddress =
    dummyDaos[networkName].dao[
      isTokenVoting ? 'TokenVoting' : 'AddresslistVoting'
    ].address;
  const votingAddress =
    dummyDaos[networkName].dao[
      isTokenVoting ? 'TokenVoting' : 'AddresslistVoting'
    ].voting;

  // metadata
  const metadataObj = {
    name: isTokenVoting
      ? 'TokenVoting Dummy Proposal'
      : 'AddresslistVoting Dummy Proposal',
    description: 'Dummy withdraw proposal for QA and testing purposes...',
    links: [
      {label: 'link01', url: 'https://link.01'},
      {label: 'link02', url: 'https://link.02'},
    ],
  };
  const client = IPFS.create({
    url: 'https://ipfs-0.aragon.network/api/v0',
    headers: {
      'X-API-KEY': 'yRERPRwFAb5ZiV94XvJdgvDKoGEeFerfFsAQ65',
    },
  });
  const cid = await client.add(JSON.stringify(metadataObj));

  console.log('ipfs cid', cid.path);

  let metadata = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(cid.path));

  // action
  // get one of the deposits
  const dummyDAOFile = await fs.readFile(path.join('./', 'dummy_daos.json'));
  let content = JSON.parse(dummyDAOFile.toString());

  const deposits =
    content[networkName].dao[
      isTokenVoting ? 'TokenVoting' : 'AddresslistVoting'
    ].deposits;

  const deposit = deposits[getRandomInt(deposits.length)];

  // prepare action
  let ABI = [
    'function withdraw(address _token, address _to, uint256 _amount, string _reference)',
  ];
  let iface = new ethers.utils.Interface(ABI);
  let encoded = iface.encodeFunctionData('withdraw', [
    deposit.token,
    signer.address,
    ethers.utils.parseEther(deposit.amount),
    'withdrawing from dao to:' + signer.address,
  ]);

  const actions = [[daoAddress, '0', encoded]];

  let overrides = await gas.setGasOverride(provider);

  // initiate Voting contract
  let VotingContract;
  if (isTokenVoting) {
    VotingContract = new ethers.Contract(
      votingAddress,
      TokenVotingJson.abi,
      signer
    );
  } else {
    VotingContract = new ethers.Contract(
      votingAddress,
      AllowVotingJson.abi,
      signer
    );
  }

  let proposalTx = await VotingContract.createProposal(
    metadata,
    actions,
    0,
    0,
    true,
    2,
    overrides
  ); // vote Yea and execute

  await proposalTx.wait(1);

  const resultObj = {
    proposalTx: proposalTx.hash,
    metadata: metadataObj,
    dao: daoAddress,
  };

  console.log('writing results:', resultObj, 'to file.', '\n');

  // edit or add property
  if (
    !content[networkName].dao[
      isTokenVoting ? 'TokenVoting' : 'AddresslistVoting'
    ].proposal
  ) {
    content[networkName].dao[
      isTokenVoting ? 'TokenVoting' : 'AddresslistVoting'
    ].proposal = {};
  }
  content[networkName].dao[
    isTokenVoting ? 'TokenVoting' : 'AddresslistVoting'
  ].proposal = resultObj;

  //write file
  await fs.writeFile(
    path.join('./', 'dummy_daos.json'),
    JSON.stringify(content, null, 2)
  );

  console.log('!Done');
}

proposal()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
