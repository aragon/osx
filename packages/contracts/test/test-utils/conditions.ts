import {ethers} from 'hardhat';

import {PermissionConditionMock} from '../../../typechain';

export async function DeployTestPermissionCondition(): Promise<PermissionConditionMock> {
  const aclConditionFactory = await ethers.getContractFactory(
    'PermissionConditionMock'
  );
  const permissionCondition = await aclConditionFactory.deploy();
  return permissionCondition;
}
