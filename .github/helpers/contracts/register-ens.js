const ethers = require('ethers');
const crypto = require('crypto');
const {setTimeout} = require('timers/promises');

async function main() {
  if (process.argv.length < 5) {
    console.log('register-ens.ts DOMAINNAME DURATION RESOLVER');
    return;
  }

  const ENS_REGISTRY = process.env.ENS_REGISTRY;
  const provider = new ethers.providers.InfuraProvider(
    process.env.NETWORK,
    '579ebd226d934b2fac48c7ffb0c1907c'
  );
  let wallet = new ethers.Wallet(process.env.ETH_KEY || '');
  wallet = wallet.connect(provider);
  const walletAddress = await wallet.getAddress();
  const domainName = process.argv[process.argv.length - 3];
  const duration = process.argv[process.argv.length - 2];
  const resolver = process.argv[process.argv.length - 1];
  const secret = `0x${crypto.randomBytes(32).toString('hex')}`;

  console.log(`Using address: ${walletAddress}`);
  console.log(`Using ENS: ${ENS_REGISTRY}`);
  console.log(`Using Chain: ${(await wallet.provider.getNetwork()).name}`);
  console.log(`Registering: ${domainName}.eth`);
  console.log(`Duration: ${duration}`);
  console.log(`Resolver: ${resolver}`);
  console.log(`Using Secret: ${secret}`);

  console.log('Get contract object');
  const registry = new ethers.Contract(ENS_REGISTRY, RegistryAbi, wallet);

  console.log('Check availabability');
  const available = await registry.available(domainName);
  if (!available) {
    console.error('Not available');
    return;
  }

  console.log('Generating commitment');
  const commitment = await registry.callStatic.makeCommitmentWithConfig(
    domainName,
    walletAddress,
    secret,
    resolver,
    walletAddress
  );
  console.log(`Commitment: ${commitment}`);
  console.log(`Commiting....`);
  const commitTX = await registry.commit(commitment);
  console.log(
    `Transaction ${commitTX.hash} sent. Waiting for confirmation....`
  );
  await commitTX.wait();
  const minCommitmentAge = await registry.minCommitmentAge();
  console.log(`Commited! Wait ${minCommitmentAge}secs`);

  await setTimeout(minCommitmentAge * 1000);

  console.log(`Getting price`);
  const price = await registry.callStatic.rentPrice(domainName, duration);
  console.log(`Price: ${ethers.utils.formatEther(price)}`);

  console.log(`Registering....`);
  const registeringTXGasEstimation =
    await registry.estimateGas.registerWithConfig(
      domainName,
      walletAddress,
      duration,
      secret,
      resolver,
      walletAddress,
      {value: price}
    );
  const registeringTX = await registry.registerWithConfig(
    domainName,
    walletAddress,
    duration,
    secret,
    resolver,
    walletAddress,
    {
      value: price,
      gasLimit: registeringTXGasEstimation.add(100000),
    }
  );
  console.log(
    `Transaction ${registeringTX.hash} sent. Waiting for confirmation....`
  );
  await registeringTX.wait();
  console.log(`Registered!`);
  return;
}

main();

const RegistryAbi = [
  {
    constant: true,
    inputs: [
      {
        internalType: 'string',
        name: 'name',
        type: 'string',
      },
      {
        internalType: 'uint256',
        name: 'duration',
        type: 'uint256',
      },
    ],
    name: 'rentPrice',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      {
        internalType: 'string',
        name: 'name',
        type: 'string',
      },
    ],
    name: 'available',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'minCommitmentAge',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      {
        internalType: 'bytes32',
        name: 'commitment',
        type: 'bytes32',
      },
    ],
    name: 'commit',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      {
        internalType: 'string',
        name: 'name',
        type: 'string',
      },
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        internalType: 'bytes32',
        name: 'secret',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'resolver',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'addr',
        type: 'address',
      },
    ],
    name: 'makeCommitmentWithConfig',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    payable: false,
    stateMutability: 'pure',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      {
        internalType: 'string',
        name: 'name',
        type: 'string',
      },
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'duration',
        type: 'uint256',
      },
      {
        internalType: 'bytes32',
        name: 'secret',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'resolver',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'addr',
        type: 'address',
      },
    ],
    name: 'registerWithConfig',
    outputs: [],
    payable: true,
    stateMutability: 'payable',
    type: 'function',
  },
];
