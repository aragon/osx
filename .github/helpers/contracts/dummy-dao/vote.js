const fs = require('fs/promises');
const fetch = require('node-fetch');
const path = require('path');
const IPFS = require('ipfs-http-client');
const {ethers} = require('ethers');
const networks = require('../../../../packages/contracts/networks.json');
const Erc20VotingJson = require('../../../../packages/contracts/artifacts/contracts/voting/erc20/ERC20Voting.sol/ERC20Voting.json');
const WhiteVotingJson = require('../../../../packages/contracts/artifacts/contracts/voting/allowlist/AllowlistVoting.sol/AllowlistVoting.json');
const dummyDaos = require('../../../../dummy_daos.json');
const gas = require('./estimateGas');

async function vote() {
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
      WhiteVotingJson.abi,
      signer
    );
  }

  let proposalTx = await VotingContract.vote(0, 3, false, overrides); // vote Yea and execute

  await proposalTx.wait(1);

  const resultObj = {
    proposalTx: proposalTx.hash,
    dao: daoAddress,
  };

  console.log('writing results:', resultObj, 'to file.', '\n');

  // edit or add property
  const dummyDAOFile = await fs.readFile(path.join('./', 'dummy_daos.json'));
  let content = JSON.parse(dummyDAOFile.toString());

  if (
    !content[networkName].dao[
      isERC20Voting === 'erc20' ? 'ERC20Voting' : 'AllowlistVoting'
    ].additionalVote
  ) {
    content[networkName].dao[
      isERC20Voting === 'erc20' ? 'ERC20Voting' : 'AllowlistVoting'
    ].additionalVote = {};
  }
  content[networkName].dao[
    isERC20Voting === 'erc20' ? 'ERC20Voting' : 'AllowlistVoting'
  ].additionalVote = resultObj;

  //write file
  await fs.writeFile(
    path.join('./', 'dummy_daos.json'),
    JSON.stringify(content, null, 2)
  );

  console.log('!Done');
}

vote()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
