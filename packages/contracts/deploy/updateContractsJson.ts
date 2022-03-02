import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {updateActiveContractsJSON} from './helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const activeContracts: {[index: string]: {[index: string]: string}} = {};
  let allDeployments = await deployments.all();

  for (const contractName of Object.keys(allDeployments)) {
    const contract = allDeployments[contractName];
    if (contract) {
      if (!activeContracts[hre.network.name]) {
        activeContracts[hre.network.name] = {};
      }
      activeContracts[hre.network.name][contractName] = contract.address;
    }
  }
  await updateActiveContractsJSON(activeContracts);
};

export default func;
func.tags = ['DAOFactory', 'TokenFactory', 'Registry', 'UpdateContractsJson'];
func.runAtTheEnd = true;
func.skip = (hre: HardhatRuntimeEnvironment) =>
  Promise.resolve(
    hre.network.name === 'localhost' ||
      hre.network.name === 'hardhat' ||
      hre.network.name === 'coverage'
  );
