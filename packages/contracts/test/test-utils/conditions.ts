import hre, {ethers} from 'hardhat';

import {
  PermissionConditionMock,
  PermissionConditionMock__factory,
} from '../../typechain';

export async function DeployTestPermissionCondition(): Promise<PermissionConditionMock> {
  const signers = await ethers.getSigners();
  // TODO:GIORGI test commented
  // const aclConditionFactory = new PermissionConditionMock__factory(signers[0]);
  // const permissionCondition = await aclConditionFactory.deploy();

  const permissionCondition = await hre.wrapper.deploy('PermissionConditionMock')
  
  return permissionCondition;
}
