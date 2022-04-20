const fs = require('fs/promises');
const path = require('path');
const {ethers} = require('ethers');
const networks = require('../../../../packages/contracts/networks.json');
const daoJson = require('../../../../packages/contracts/artifacts/contracts/core/IDAO.sol/IDAO.json');
const erc20Json = require('../../../../packages/contracts/artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json');
const dummyDaos = require('../../../../dummy_daos.json');

// assume the privKey ownes the following tokens
const tokensList = {
  rinkeby: [
    {
      name: 'Dai',
      address: '0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735',
    },
    {
      name: 'Uni',
      address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    },
  ],
  mumbai: [
    {
      name: 'WMATIC',
      address: '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889',
    },
  ],
};

async function deposit() {
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
      isERC20Voting === 'erc20' ? 'ERC20Voting' : 'WhitelistVoting'
    ].address;
  // initiate DAO contract
  const DaoContract = new ethers.Contract(daoAddress, daoJson.abi, signer);

  // prepare for deposit
  const amount = ethers.utils.parseEther('0.001');
  let results = [];

  // deposit ETH
  console.log(
    '\n',
    'Depositing amount:',
    amount.toString(),
    'of ETH to DAO:',
    daoAddress,
    '\n'
  );

  let overrides = {
    value: amount,
  };
  const tx = await DaoContract.deposit(
    ethers.constants.AddressZero,
    amount,
    'dummy deposit of ETH, amount:' + ethers.utils.formatEther(amount),
    overrides
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
  const tokens = tokensList[networkName];
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

    const approveTx = await erc20TokenContract.approve(daoAddress, amount);
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
        ethers.utils.formatEther(amount)
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

  console.log('writing results:', results, 'to file.', '\n');

  // read file and make object
  const dummyDAOFile = await fs.readFile(path.join('./', 'dummy_daos.json'));
  let content = JSON.parse(dummyDAOFile.toString());
  // edit or add property
  content[networkName].dao[
    isERC20Voting === 'erc20' ? 'ERC20Voting' : 'WhitelistVoting'
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
