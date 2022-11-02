import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {TASK_ETHERSCAN_VERIFY} from 'hardhat-deploy';

import {verifyContract} from '../utils/etherscan';
import {getContractAddress} from './helpers';

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nVerifying contracts');

  const {deployments, ethers, run} = hre;

  const minutesDelay = 180000; // 3 minutes - Etherscan needs some time to process before trying to verify.

  console.log(
    `Waiting for ${
      minutesDelay / 60000
    } minutes, so Etherscan is aware of contracts before verifying`
  );

  await delay(minutesDelay);

  // Prepare contracts and addresses
  const managingDAOAddress = await getContractAddress('DAO', hre);

  // Framework
  const DAORegistryContract = await ethers.getContractAt(
    'DAORegistry',
    (
      await deployments.get('DAORegistry_Implementation')
    ).address
  );
  const PluginRepoRegistryContract = await ethers.getContractAt(
    'PluginRepoRegistry',
    (
      await deployments.get('PluginRepoRegistry_Implementation')
    ).address
  );
  const PluginRepoFactoryContract = await ethers.getContractAt(
    'PluginRepoFactory',
    (
      await deployments.get('PluginRepoFactory')
    ).address
  );
  const PluginSetupProcessorContract = await ethers.getContractAt(
    'PluginSetupProcessor',
    (
      await deployments.get('PluginSetupProcessor')
    ).address
  );
  const DAOFactoryContract = await ethers.getContractAt(
    'DAOFactory',
    (
      await deployments.get('DAOFactory')
    ).address
  );

  // Plugins
  const AllowlistVotingSetupContract = await ethers.getContractAt(
    'AllowlistVotingSetup',
    (
      await deployments.get('AllowlistVotingSetup')
    ).address
  );
  const ERC20VotingSetupContract = await ethers.getContractAt(
    'ERC20VotingSetup',
    (
      await deployments.get('ERC20VotingSetup')
    ).address
  );

  // Base contracts
  const daoBase = await DAOFactoryContract.daoBase();
  const ENSSubdomainRegistrarBase = await ethers.getContractAt(
    'ENSSubdomainRegistrar',
    (
      await deployments.get('DAO_ENSSubdomainRegistrar_Implementation')
    ).address
  );
  const allowlistVotingBase =
    await AllowlistVotingSetupContract.getImplementationAddress();
  const erc20VotingBase =
    await ERC20VotingSetupContract.getImplementationAddress();
  const governanceERC20Base =
    await ERC20VotingSetupContract.governanceERC20Base();
  const governanceWrappedERC20Base =
    await ERC20VotingSetupContract.governanceWrappedERC20Base();
  const merkleMinterBase = await ERC20VotingSetupContract.merkleMinterBase();
  const distributorBase = await ERC20VotingSetupContract.distributorBase();
  const pluginRepoBase = await PluginRepoFactoryContract.pluginRepoBase();

  // Prepare verify Array
  // So each verify is fired in a secuence
  // and await results
  const verifyObjArray: {address: string; args: any[any]}[] = [];

  // push to Verify array
  // Framework contracts.
  verifyObjArray.push({address: DAORegistryContract.address, args: []});
  verifyObjArray.push({address: PluginRepoRegistryContract.address, args: []});
  verifyObjArray.push({
    address: PluginRepoFactoryContract.address,
    args: [PluginRepoRegistryContract.address],
  });
  verifyObjArray.push({
    address: PluginSetupProcessorContract.address,
    args: [managingDAOAddress, PluginRepoRegistryContract.address],
  });
  verifyObjArray.push({
    address: DAOFactoryContract.address,
    args: [DAORegistryContract.address, PluginSetupProcessorContract.address],
  });

  // Base contracts
  verifyObjArray.push({address: daoBase, args: []});
  verifyObjArray.push({address: ENSSubdomainRegistrarBase.address, args: []});
  verifyObjArray.push({address: allowlistVotingBase, args: []});
  verifyObjArray.push({address: erc20VotingBase, args: []});
  verifyObjArray.push({
    address: governanceERC20Base,
    args: [managingDAOAddress, '', ''],
  });
  verifyObjArray.push({
    address: governanceWrappedERC20Base,
    args: [governanceERC20Base, '', ''],
  });
  verifyObjArray.push({address: merkleMinterBase, args: []});
  verifyObjArray.push({address: distributorBase, args: []});
  verifyObjArray.push({address: pluginRepoBase, args: []});

  console.log('Starting to verify now ... .. .');

  for (let index = 0; index < verifyObjArray.length; index++) {
    const element = verifyObjArray[index];

    console.log(
      `Verifying address ${element.address} with constructor argument ${element.args}.`
    );
    await verifyContract(element.address, element.args);

    // Etherscan Max rate limit is 1/5s,
    // use 6s just to be safe.
    console.log(
      `Delaying 6s, so we dont reach Etherscan's Max rate limit of 1/5s.`
    );
    delay(6000);
  }
};
export default func;
func.tags = ['Verify'];
func.runAtTheEnd = true;
func.skip = (hre: HardhatRuntimeEnvironment) =>
  Promise.resolve(
    hre.network.name === 'localhost' ||
      hre.network.name === 'hardhat' ||
      hre.network.name === 'coverage'
  );
