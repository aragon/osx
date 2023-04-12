import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DAOFactory__factory, DAO__factory} from '../../../typechain';
import {getContractAddress} from '../../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nUpdate ManagingDAO to new implemenation');

  const daoFactoryAddress = await getContractAddress('DAOFactory', hre);
  const daoImplementation = await DAOFactory__factory.connect(
    daoFactoryAddress,
    hre.ethers.provider
  ).daoBase();

  const managingDAOAddress = await getContractAddress('managingDAO', hre);
  const daoInterface = DAO__factory.connect(
    managingDAOAddress,
    hre.ethers.provider
  );
  const upgradeTX = await daoInterface.populateTransaction.upgradeTo(
    daoImplementation
  );

  if (!upgradeTX.to || !upgradeTX.data) {
    throw new Error(`Failed to populate upgradeTo transaction`);
  }
  hre.managingDAOActions.push({
    to: upgradeTX.to,
    data: upgradeTX.data,
    value: 0,
    description: `Updating managingDAO implemenation contract to ${daoImplementation}`,
  });
};
export default func;
func.tags = ['ManagingDAO'];
