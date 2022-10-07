const fs = require('fs/promises');
const fetch = require('node-fetch');
const path = require('path');
const IPFS = require('ipfs-http-client');
const {ethers} = require('ethers');

const networks = require('../../../../packages/contracts/networks.json');
const Erc20VotingJson = require('../../../../packages/contracts/artifacts/contracts/voting/erc20/ERC20Voting.sol/ERC20Voting.json');
const AllowVotingJson = require('../../../../packages/contracts/artifacts/contracts/voting/allowlist/AllowlistVoting.sol/AllowlistVoting.json');
const dummyDaos = require('../../../../dummy_daos.json');
const gas = require('./estimateGas');

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

async function proposal() {
  const args = process.argv.slice(2);
  const networkName = args[0];
  const privKey = args[1];
  const isERC20Voting = args[2];
  const provider = new ethers.providers.JsonRpcProvider(
    networks[networkName].url
  );
  const signer = new ethers.Wallet(privKey, provider);

  const daoAddress =
    dummyDaos[networkName].dao[
      isERC20Voting === 'erc20' ? 'ERC20Voting' : 'AllowlistVoting'
    ].address;
  const votingAddress =
    dummyDaos[networkName].dao[
      isERC20Voting === 'erc20' ? 'ERC20Voting' : 'AllowlistVoting'
    ].voting;

  // metadata
  const metadataObj = {
    name:
      isERC20Voting === 'erc20'
        ? 'ERC20Voting Dummy Proposal'
        : 'AllowlistVoting Dummy Proposal',
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
      isERC20Voting === 'erc20' ? 'ERC20Voting' : 'AllowlistVoting'
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
  if (isERC20Voting === 'erc20') {
    VotingContract = new ethers.Contract(
      votingAddress,
      Erc20VotingJson.abi,
      signer
    );
  } else {
    VotingContract = new ethers.Contract(
      votingAddress,
      AllowVotingJson.abi,
      signer
    );
  }

  let proposalTx = await VotingContract.createVote(
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
      isERC20Voting === 'erc20' ? 'ERC20Voting' : 'AllowlistVoting'
    ].proposal
  ) {
    content[networkName].dao[
      isERC20Voting === 'erc20' ? 'ERC20Voting' : 'AllowlistVoting'
    ].proposal = {};
  }
  content[networkName].dao[
    isERC20Voting === 'erc20' ? 'ERC20Voting' : 'AllowlistVoting'
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
