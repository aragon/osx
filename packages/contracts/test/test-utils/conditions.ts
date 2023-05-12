import {ethers} from 'hardhat';

import {PermissionConditionMock} from '../../../typechain';
import {PermissionConditionMock__factory} from '../../typechain';

export async function DeployTestPermissionCondition(): Promise<PermissionConditionMock> {
  const aclConditionFactory = new PermissionConditionMock__factory(
    (await ethers.getSigners())[0]
  );
  const permissionCondition = await aclConditionFactory.deploy();
  return permissionCondition;
}
