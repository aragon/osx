import {ethers} from 'hardhat';

import {
  PermissionConditionMock,
  PermissionConditionMock__factory,
} from '../../typechain';

export async function DeployTestPermissionCondition(): Promise<PermissionConditionMock> {
  const signers = await ethers.getSigners();
  const aclConditionFactory = new PermissionConditionMock__factory(signers[0]);
  const permissionCondition = await aclConditionFactory.deploy();
  return permissionCondition;
}
