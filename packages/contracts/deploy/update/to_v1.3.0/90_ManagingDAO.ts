import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DAOFactory__factory, DAO__factory} from '../../../typechain';
import {getContractAddress} from '../../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nUpgrade the managing DAO to new Implementation');

  const daoFactoryAddress = await getContractAddress('DAOFactory', hre);
  const newDaoImplementation = await DAOFactory__factory.connect(
    daoFactoryAddress,
    hre.ethers.provider
  ).daoBase();

  const managingDAOAddress = await getContractAddress('managingDAO', hre);
  const managingDAO = DAO__factory.connect(
    managingDAOAddress,
    hre.ethers.provider
  );
  const upgradeTX = await managingDAO.populateTransaction.upgradeToAndCall(
    newDaoImplementation,
    managingDAO.interface.encodeFunctionData('initializeFrom', [[1, 0, 0], []])
  );

  if (!upgradeTX.to || !upgradeTX.data) {
    throw new Error(`Failed to populate upgradeToAndCall transaction`);
  }
  hre.managingDAOActions.push({
    to: upgradeTX.to,
    data: upgradeTX.data,
    value: 0,
    description: `Upgrade the managing DAO to the new implementation (${newDaoImplementation})`,
  });
};
export default func;
func.tags = ['ManagingDAO', 'v1.3.0'];
