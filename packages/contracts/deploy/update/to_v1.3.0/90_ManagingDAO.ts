import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DAOFactory__factory, DAO__factory} from '../../../typechain';
import {getContractAddress} from '../../helpers';
import {UPDATE_INFOS} from '../../../utils/updates';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nUpgrade ManagingDAO to new implemenation');

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
    description: `Upgrading managingDAO implemenation contract to ${newDaoImplementation}`,
  });
};
export default func;
func.tags = ['ManagingDAO'].concat(UPDATE_INFOS['v1_3_0'].tags);
