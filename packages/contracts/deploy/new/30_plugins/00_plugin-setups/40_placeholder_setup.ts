import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {uploadToIPFS} from '../../../helpers';

import placeholderBuildMetadata from '../../../../src/plugins/placeholder-version/build-metadata.json';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  await deploy('PlaceholderSetup', {
    from: deployer,
    args: [],
    log: true,
  });

  const {network} = hre;

  hre.placeholderBuildCIDPath = await uploadToIPFS(
    JSON.stringify(placeholderBuildMetadata),
    network.name
  );
};

export default func;
func.tags = ['PlaceholderSetup'];
