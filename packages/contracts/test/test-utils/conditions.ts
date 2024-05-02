import hre, {ethers} from 'hardhat';

import {PermissionConditionMock} from '../../typechain';

export async function DeployTestPermissionCondition(): Promise<PermissionConditionMock> {
  const permissionCondition = await hre.wrapper.deploy(
    'PermissionConditionMock'
  );

  return permissionCondition;
}
