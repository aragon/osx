import {ethers} from 'hardhat';

import {PermissionOracleMock} from '../../typechain';

export async function DeployTestPermissionOracle(): Promise<PermissionOracleMock> {
  const aclOracleFactory = await ethers.getContractFactory(
    'PermissionOracleMock'
  );
  const permissionOracle = await aclOracleFactory.deploy();
  return permissionOracle;
}
