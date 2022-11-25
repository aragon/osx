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

async function vote() {
  const args = process.argv.slice(2);
  const networkName = args[0];
  const privKey = args[1];
  const isTokenVoting = args[2];
  const provider = new ethers.providers.JsonRpcProvider(
    networks[networkName].url
  );
  const signer = new ethers.Wallet(privKey, provider);

  const daoAddress =
    dummyDaos[networkName].dao[
      isTokenVoting === 'token' ? 'TokenVoting' : 'AddresslistVoting'
    ].address;
  const votingAddress =
    dummyDaos[networkName].dao[
      isTokenVoting === 'token' ? 'TokenVoting' : 'AddresslistVoting'
    ].voting;

  let overrides = await gas.setGasOverride(provider);

  // initiate Voting contract
  let VotingContract;
  if (isTokenVoting === 'token') {
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
      isTokenVoting === 'token' ? 'TokenVoting' : 'AddresslistVoting'
    ].additionalVote
  ) {
    content[networkName].dao[
      isTokenVoting === 'token' ? 'TokenVoting' : 'AddresslistVoting'
    ].additionalVote = {};
  }
  content[networkName].dao[
    isTokenVoting === 'token' ? 'TokenVoting' : 'AddresslistVoting'
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
