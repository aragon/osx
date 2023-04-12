import {ethers} from 'hardhat';

import {PluginRepoRegistry, PluginSetupProcessor} from '../../../typechain';

import {getMergedABI} from '../../utils/abi';

export async function deployPluginSetupProcessor(
  pluginRepoRegistry: PluginRepoRegistry
): Promise<PluginSetupProcessor> {
  let psp: PluginSetupProcessor;

  const {abi, bytecode} = await getMergedABI(
    // @ts-ignore
    hre,
    'PluginSetupProcessor',
    ['ERC1967Upgrade']
  );

  const PluginSetupProcessor = new ethers.ContractFactory(
    abi,
    bytecode,
    (await ethers.getSigners())[0]
  );

  psp = (await PluginSetupProcessor.deploy(
    pluginRepoRegistry.address
  )) as PluginSetupProcessor;

  return psp;
}
