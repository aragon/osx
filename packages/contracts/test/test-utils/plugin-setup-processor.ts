import {ethers} from 'hardhat';
import {utils, constants} from 'ethers';

import {PluginRepoRegistry, PluginSetupProcessor} from '../../typechain';

import {getMergedABI} from '../../utils/abi';

export async function deployPluginSetupProcessor(
  managingDao: any,
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
    managingDao.address,
    pluginRepoRegistry.address
  )) as PluginSetupProcessor;

  return psp;
}