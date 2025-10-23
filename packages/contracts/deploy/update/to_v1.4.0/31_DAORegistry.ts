import daoRegistryArtifact from '../../../artifacts/src/framework/dao/DAORegistry.sol/DAORegistry.json';
import {
  DAOFactory__factory,
  DAORegistry__factory,
  DAO__factory,
} from '../../../typechain';
import {DAORegistry} from '../../../typechain/@aragon/osx-v1.0.1/framework/dao/DAORegistry.sol';
import {getContractAddress} from '../../helpers';
import {getProtocolVersion} from '@aragon/osx-commons-sdk';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nUpgrade the DAORegistry to new Implementation');

  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  const daoRegistryAddress = await getContractAddress('DAORegistryProxy', hre);
  const daoRegistry = DAORegistry__factory.connect(
    daoRegistryAddress,
    hre.ethers.provider
  );

  const result = await deploy('DAORegistryImplementation', {
    contract: daoRegistryArtifact,
    from: deployer.address,
    args: [],
    log: true,
  });

  const upgradeTX = await daoRegistry.populateTransaction.upgradeTo(
    result.address
  );

  if (!upgradeTX.to || !upgradeTX.data) {
    throw new Error(`Failed to populate upgradeToAndCall transaction`);
  }

  hre.aragonToVerifyContracts.push({
    address: result.address,
    args: [],
  });

  hre.managementDAOActions.push({
    to: upgradeTX.to,
    data: upgradeTX.data,
    value: 0,
    description: `\n- Upgrade the **DaoRegistry** (\`${daoRegistryAddress}\`) to the new **implementation** (\`${result.address}\`).`,
  });
};
export default func;
func.tags = ['DAORegistry', 'v1.4.0'];
