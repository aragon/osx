import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {TASK_ETHERSCAN_VERIFY} from 'hardhat-deploy';

import {verifyContract} from '../utils/etherscan';

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers, run} = hre;

  console.log('Verifying registry and factories contracts');

  console.log(
    'Waiting for 3 minutes so Etherscan is aware of contracts before verifying'
  );
  await delay(180000); // 3 minutes - Etherscan needs some time to process before trying to verify.
  console.log('Starting to verify now');

  await run(TASK_ETHERSCAN_VERIFY, {
    license: 'GPL-3.0',
    solcInput: true,
  });

  const RegistryContract = await ethers.getContractAt(
    'Registry',
    (
      await deployments.get('Registry')
    ).address
  );

  const DAOFactoryContract = await ethers.getContractAt(
    'DAOFactory',
    (
      await deployments.get('DAOFactory')
    ).address
  );

  const TokenFactoryContract = await ethers.getContractAt(
    'TokenFactory',
    (
      await deployments.get('TokenFactory')
    ).address
  );

  console.log('Verifying main contracts');

  await verifyContract(RegistryContract.address, []);
  await verifyContract(TokenFactoryContract.address, []);
  await verifyContract(DAOFactoryContract.address, [
    RegistryContract.address,
    TokenFactoryContract.address,
  ]);

  console.log('Verifying base contracts');

  const votingBase = await DAOFactoryContract.votingBase();
  const daoBase = await DAOFactoryContract.daoBase();
  const governanceERC20Base = await TokenFactoryContract.governanceERC20Base();
  const governanceWrappedERC20Base =
    await TokenFactoryContract.governanceWrappedERC20Base();
  const merkleMinterBase = await TokenFactoryContract.merkleMinterBase();
  const distributorBase = await TokenFactoryContract.distributorBase();

  await verifyContract(votingBase, []);
  await verifyContract(daoBase, []);
  await verifyContract(governanceERC20Base, []);
  await verifyContract(governanceWrappedERC20Base, []);
  await verifyContract(merkleMinterBase, []);
  await verifyContract(distributorBase, []);
};
export default func;
func.tags = ['DAOFactory', 'TokenFactory', 'Registry'];
func.runAtTheEnd = true;
func.skip = (hre: HardhatRuntimeEnvironment) =>
  Promise.resolve(
    hre.network.name === 'localhost' ||
      hre.network.name === 'hardhat' ||
      hre.network.name === 'coverage'
  );
