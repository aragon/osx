import {DAOFactory__factory, DAO__factory} from '../../../typechain';
import {getContractAddress} from '../../helpers';
import {getProtocolVersion} from '@aragon/osx-commons-sdk';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nUpgrade the management DAO to new Implementation');

  const daoFactoryAddress = await getContractAddress('DAOFactory', hre);
  const newDaoImplementation = await DAOFactory__factory.connect(
    daoFactoryAddress,
    hre.ethers.provider
  ).daoBase();

  const managementDAOAddress = await getContractAddress(
    'ManagementDAOProxy',
    hre
  );
  const managementDAO = DAO__factory.connect(
    managementDAOAddress,
    hre.ethers.provider
  );

  const upgradeTX = await managementDAO.populateTransaction.upgradeToAndCall(
    newDaoImplementation,
    managementDAO.interface.encodeFunctionData('initializeFrom', [
      await getProtocolVersion(managementDAO),
      [],
    ])
  );

  if (!upgradeTX.to || !upgradeTX.data) {
    throw new Error(`Failed to populate upgradeToAndCall transaction`);
  }
  hre.managementDAOActions.push({
    to: upgradeTX.to,
    data: upgradeTX.data,
    value: 0,
    description: `Upgrade the <strong>management DAO</strong> (<code>${managementDAOAddress}</code>) to the new <strong>implementation</strong> (<code>${newDaoImplementation}</code>).`,
  });
};
export default func;
func.tags = ['ManagementDAO', 'v1.4.0'];
