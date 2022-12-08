const fs = require('fs/promises');
const fetch = require('node-fetch');
const path = require('path');
const {ethers} = require('ethers');

const networks = require('../../../../packages/contracts/networks.json');
const daoJson = require('../../../../packages/contracts/artifacts/contracts/core/IDAO.sol/IDAO.json');
const erc20Json = require('../../../../packages/contracts/artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json');
const dummyDaos = require('../../../../dummy_daos.json');
const gas = require('./estimateGas');
const {TOKENLIST} = require('./constans');

async function deposit() {
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
  // initiate DAO contract
  const DaoContract = new ethers.Contract(daoAddress, daoJson.abi, signer);

  // prepare for deposit
  const amount = ethers.utils.parseEther('0.001');
  let results = [];

  let overrides = await gas.setGasOverride(provider);

  // deposit ETH
  console.log(
    '\n',
    'Depositing amount:',
    amount.toString(),
    'of ETH to DAO:',
    daoAddress,
    '\n'
  );

  const tx = await DaoContract.deposit(
    ethers.constants.AddressZero,
    amount,
    'dummy deposit of ETH, amount:' + ethers.utils.formatEther(amount),
    {...overrides, value: amount}
  );

  await tx.wait(1);

  const ethResultObj = {
    approveTx: '',
    depositTx: tx.hash,
    tokenName: 'ETH',
    token: ethers.constants.AddressZero,
    amount: ethers.utils.formatEther(amount),
    dao: daoAddress,
  };

  results.push(ethResultObj);

  // deposit token
  const tokens = TOKENLIST[networkName];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    // approve
    const erc20Token = new ethers.Contract(
      token.address,
      erc20Json.abi,
      signer
    );

    console.log(
      'Giving Approvals for token:',
      token.address,
      'to DAO:',
      daoAddress,
      '\n'
    );

    const balance = await erc20Token.balanceOf(signer.address);

    console.log('balance:', balance.toString());

    if (balance.gt(ethers.BigNumber.from(0))) {
      const approveTx = await erc20Token.approve(daoAddress, amount, overrides);
      await approveTx.wait(1);

      // deposit
      console.log(
        'Depositing amount:',
        amount.toString(),
        'of token:',
        token.address,
        'to DAO:',
        daoAddress,
        '\n'
      );

      const tokenDepositTx = await DaoContract.deposit(
        token.address,
        amount,
        'dummy deposit of:' +
          token.name +
          'amount:' +
          ethers.utils.formatEther(amount),
        overrides
      );

      await tokenDepositTx.wait(1);

      const resultObj = {
        approveTx: approveTx.hash,
        depositTx: tokenDepositTx.hash,
        tokenName: token.name,
        token: token.address,
        amount: ethers.utils.formatEther(amount),
        dao: daoAddress,
      };

      results.push(resultObj);
    }
  }

  console.log('writing results:', results, 'to file.', '\n');

  // read file and make object
  const dummyDAOFile = await fs.readFile(path.join('./', 'dummy_daos.json'));
  let content = JSON.parse(dummyDAOFile.toString());
  // edit or add property
  if (
    !content[networkName].dao[
      isTokenVoting === 'token' ? 'TokenVoting' : 'AddresslistVoting'
    ].deposits
  ) {
    content[networkName].dao[
      isTokenVoting === 'token' ? 'TokenVoting' : 'AddresslistVoting'
    ].deposits = [];
  }
  content[networkName].dao[
    isTokenVoting === 'token' ? 'TokenVoting' : 'AddresslistVoting'
  ].deposits = results;

  //write file
  await fs.writeFile(
    path.join('./', 'dummy_daos.json'),
    JSON.stringify(content, null, 2)
  );

  console.log('done!');
}

deposit()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
