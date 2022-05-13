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
const parseArgs = require('minimist');

async function deposit() {
  console.log('\n=== Staring depositing to DAOs ===');

  const args = parseArgs(process.argv.slice(2));

  const daoJsonKey = args.daoKey;
  const networkName = args.network;
  const privKey = args.privKey;

  const provider = new ethers.providers.JsonRpcProvider(
    networkName === 'localhost'
      ? 'http://127.0.0.1:8545'
      : networks[networkName].url
  );

  const signer = new ethers.Wallet(privKey, provider);

  const daoAddress = dummyDaos[networkName][daoJsonKey].address;
  // initiate DAO contract
  const DaoContract = new ethers.Contract(daoAddress, daoJson.abi, signer);

  // prepare for deposit
  const amount = ethers.utils.parseEther('0.001');
  let results = [];

  let overrides =
    networkName === 'localhost'
      ? {gasLimit: 30000000, gasPrice: 20000000000}
      : await gas.setGasOverride(provider);
  console.log('Setting fee data:', overrides);

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
    const erc20TokenContract = new ethers.Contract(
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

    const balance = await erc20TokenContract.balanceOf(signer.address);

    console.log('balance:', balance.toString());

    if (balance.gt(ethers.BigNumber.from(0))) {
      const approveTx = await erc20TokenContract.approve(
        daoAddress,
        amount,
        overrides
      );
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
  if (!content[networkName][daoJsonKey].deposits) {
    content[networkName][daoJsonKey].deposits = [];
  }
  content[networkName][daoJsonKey].deposits = results;
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
